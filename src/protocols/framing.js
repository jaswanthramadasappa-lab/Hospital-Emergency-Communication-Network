/**
 * Framing Module
 * Implements Byte Stuffing (Character-Oriented), Bit Stuffing (HDLC-like),
 * and Hospital Frame Encapsulation/Decapsulation for the emergency network.
 */

import { calculateCRC32 } from './crc.js';

export const FRAME_CONSTANTS = {
  FLAG_BYTE: 0x7E, // '~' (01111110)
  ESC_BYTE: 0x7D,  // '}' (01111101)
  XOR_MASK: 0x20,  // Standard HDLC / PPP escape mask
  BIT_FLAG: '01111110'
};

/**
 * Byte Stuffing Implementation (PPP / HDLC Byte-Oriented Mode)
 * Escapes occurrence of FLAG and ESC within the payload.
 */
export function byteStuff(payloadBytes) {
  const stuffed = [];
  const operations = [];

  for (let i = 0; i < payloadBytes.length; i++) {
    const byte = payloadBytes[i];
    if (byte === FRAME_CONSTANTS.FLAG_BYTE) {
      stuffed.push(FRAME_CONSTANTS.ESC_BYTE);
      stuffed.push(FRAME_CONSTANTS.FLAG_BYTE ^ FRAME_CONSTANTS.XOR_MASK); // 0x5E
      operations.push({
        index: i,
        original: '0x7E (FLAG)',
        stuffed: '0x7D 0x5E (ESC + 0x5E)',
        type: 'FLAG_STUFFED'
      });
    } else if (byte === FRAME_CONSTANTS.ESC_BYTE) {
      stuffed.push(FRAME_CONSTANTS.ESC_BYTE);
      stuffed.push(FRAME_CONSTANTS.ESC_BYTE ^ FRAME_CONSTANTS.XOR_MASK); // 0x5D
      operations.push({
        index: i,
        original: '0x7D (ESC)',
        stuffed: '0x7D 0x5D (ESC + 0x5D)',
        type: 'ESC_STUFFED'
      });
    } else {
      stuffed.push(byte);
    }
  }

  return {
    stuffedBytes: new Uint8Array(stuffed),
    operations,
    originalLength: payloadBytes.length,
    stuffedLength: stuffed.length
  };
}

/**
 * Byte Destuffing (Receiver side)
 */
export function byteDestuff(stuffedBytes) {
  const destuffed = [];
  let isEscaped = false;
  let errors = [];

  for (let i = 0; i < stuffedBytes.length; i++) {
    const byte = stuffedBytes[i];
    if (isEscaped) {
      destuffed.push(byte ^ FRAME_CONSTANTS.XOR_MASK);
      isEscaped = false;
    } else if (byte === FRAME_CONSTANTS.ESC_BYTE) {
      isEscaped = true;
    } else if (byte === FRAME_CONSTANTS.FLAG_BYTE) {
      // Unexpected flag in payload
      errors.push(`Unexpected FLAG byte at index ${i}`);
    } else {
      destuffed.push(byte);
    }
  }

  return {
    destuffedBytes: new Uint8Array(destuffed),
    hasErrors: errors.length > 0,
    errors
  };
}

/**
 * Bit Stuffing Implementation (HDLC Bit-Oriented Mode)
 * Inserts a '0' bit after every five consecutive '1's.
 */
export function bitStuff(bitString) {
  let stuffed = '';
  let consecutiveOnes = 0;
  const insertions = [];

  for (let i = 0; i < bitString.length; i++) {
    const bit = bitString[i];
    stuffed += bit;

    if (bit === '1') {
      consecutiveOnes++;
      if (consecutiveOnes === 5) {
        // Stuff a 0
        stuffed += '0';
        insertions.push({
          position: stuffed.length - 1,
          afterIndex: i,
          reason: '5 consecutive 1s'
        });
        consecutiveOnes = 0;
      }
    } else {
      consecutiveOnes = 0;
    }
  }

  return {
    originalBits: bitString,
    stuffedBits: stuffed,
    insertions,
    originalLength: bitString.length,
    stuffedLength: stuffed.length,
    framedBitStream: FRAME_CONSTANTS.BIT_FLAG + stuffed + FRAME_CONSTANTS.BIT_FLAG
  };
}

/**
 * Bit Destuffing (Receiver side)
 * Removes the '0' bit that follows five consecutive '1's.
 */
export function bitDestuff(stuffedBits) {
  let destuffed = '';
  let consecutiveOnes = 0;
  const removals = [];

  for (let i = 0; i < stuffedBits.length; i++) {
    const bit = stuffedBits[i];

    if (consecutiveOnes === 5) {
      if (bit === '0') {
        // Stuffed bit found, skip it
        removals.push(i);
        consecutiveOnes = 0;
        continue;
      } else {
        // 6th 1 could be flag or abort
        // If followed by 0, it's 01111110 (Flag)
      }
    }

    destuffed += bit;
    if (bit === '1') {
      consecutiveOnes++;
    } else {
      consecutiveOnes = 0;
    }
  }

  return {
    destuffedBits: destuffed,
    removals
  };
}

/**
 * Construct a Full Hospital Network Frame
 * Frame Format:
 * [PREAMBLE 4B][FLAG 1B][SRC 1B][DST 1B][PRIORITY 1B][TYPE 1B][SEQ 2B][LEN 2B][PAYLOAD (stuffed)][CRC32 4B][FLAG 1B]
 */
export function constructHospitalFrame({
  srcNode,
  dstNode,
  priority = 1, // 0: CRITICAL (Code Blue), 1: HIGH (Vitals), 2: NORMAL (Lab/Pharm), 3: LOW (Cloud Sync)
  msgType = 'EMERGENCY_ALERT',
  seqNumber = 0,
  payload = ''
}) {
  const encoder = new TextEncoder();
  const rawPayloadBytes = typeof payload === 'string' ? encoder.encode(payload) : new Uint8Array(payload);
  
  // Calculate CRC-32 on raw payload + headers
  const crcData = new Uint8Array(rawPayloadBytes.length + 8);
  crcData[0] = srcNode.charCodeAt(0);
  crcData[1] = dstNode.charCodeAt(0);
  crcData[2] = priority;
  crcData[3] = seqNumber >> 8;
  crcData[4] = seqNumber & 0xFF;
  crcData.set(rawPayloadBytes, 8);
  
  const crc32 = calculateCRC32(crcData);
  const stuffingResult = byteStuff(rawPayloadBytes);

  return {
    header: {
      preamble: '0xAAAAAAAA',
      startFlag: '0x7E',
      srcNode,
      dstNode,
      priority,
      msgType,
      seqNumber,
      payloadLength: rawPayloadBytes.length,
      stuffedLength: stuffingResult.stuffedLength
    },
    rawPayload: payload,
    rawPayloadBytes,
    stuffedBytes: stuffingResult.stuffedBytes,
    stuffingOperations: stuffingResult.operations,
    crc32: crc32.toString(16).toUpperCase().padStart(8, '0'),
    crc32Num: crc32,
    trailer: {
      crc32Hex: '0x' + crc32.toString(16).toUpperCase().padStart(8, '0'),
      endFlag: '0x7E'
    },
    timestamp: Date.now()
  };
}
