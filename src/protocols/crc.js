/**
 * Cyclic Redundancy Check (CRC) Module
 * Implements CRC-32, CRC-16-CCITT, and bit-level polynomial division simulation
 * for Smart Hospital Emergency Communication Network error detection.
 */

// Standard Predefined Polynomials
export const POLYNOMIALS = {
  CRC32: {
    name: 'CRC-32 (IEEE 802.3 / Ethernet)',
    poly: 0xEDB88320,
    binaryPoly: '100000100110000010001110110110111',
    width: 32,
    init: 0xFFFFFFFF,
    xorOut: 0xFFFFFFFF
  },
  CRC16_CCITT: {
    name: 'CRC-16-CCITT (X.25 / V.41)',
    poly: 0x1021,
    binaryPoly: '10001000000100001',
    width: 16,
    init: 0xFFFF,
    xorOut: 0x0000
  },
  CRC8: {
    name: 'CRC-8 (ATM / ITU-T)',
    poly: 0x07,
    binaryPoly: '100000111',
    width: 8,
    init: 0x00,
    xorOut: 0x00
  }
};

/**
 * Standard IEEE 802.3 CRC32 calculation on Uint8Array or String
 */
export function calculateCRC32(data) {
  let bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xFF];
  }
  return ((crc ^ (-1)) >>> 0);
}

// Precomputed CRC32 Lookup Table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  CRC32_TABLE[i] = c;
}

/**
 * Standard CRC-16-CCITT calculation
 */
export function calculateCRC16(data) {
  let bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let crc = 0xFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc;
}

/**
 * Convert string or byte array to binary string
 */
export function textToBinaryString(text) {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join('');
}

/**
 * Convert binary string to hexadecimal string
 */
export function binaryStringToHex(binStr) {
  const padded = binStr.padStart(Math.ceil(binStr.length / 4) * 4, '0');
  let hex = '';
  for (let i = 0; i < padded.length; i += 4) {
    hex += parseInt(padded.slice(i, i + 4), 2).toString(16).toUpperCase();
  }
  return hex;
}

/**
 * Step-by-Step Polynomial Division Simulator for Educational Visualizer
 * Performs modulo-2 binary division: (Data << poly_degree) / Generator
 */
export function simulateBinaryPolynomialDivision(dataBits, generatorBits) {
  const genLen = generatorBits.length;
  const degree = genLen - 1;
  const augmentedData = dataBits + '0'.repeat(degree);
  
  let remainder = augmentedData.split('');
  const steps = [];
  
  for (let i = 0; i <= augmentedData.length - genLen; i++) {
    if (remainder[i] === '1') {
      const currentWindow = remainder.slice(i, i + genLen).join('');
      const xorResult = [];
      for (let j = 0; j < genLen; j++) {
        xorResult.push(remainder[i + j] === generatorBits[j] ? '0' : '1');
      }
      
      steps.push({
        stepIndex: steps.length + 1,
        bitPosition: i,
        dividendChunk: currentWindow,
        divisor: generatorBits,
        xorResult: xorResult.join(''),
        currentRemainder: remainder.slice(0, i).join('') + xorResult.join('') + remainder.slice(i + genLen).join('')
      });
      
      for (let j = 0; j < genLen; j++) {
        remainder[i + j] = xorResult[j];
      }
    }
  }
  
  const finalRemainder = remainder.slice(remainder.length - degree).join('');
  const transmittedBits = dataBits + finalRemainder;
  
  return {
    dataBits,
    generatorBits,
    augmentedData,
    steps,
    remainder: finalRemainder,
    remainderHex: binaryStringToHex(finalRemainder),
    transmittedBits
  };
}

/**
 * Verify Transmitted Bits using Modulo-2 Division
 * If remainder is all 0s, transmission is valid without detected error.
 */
export function verifyBinaryCRC(transmittedBits, generatorBits) {
  const genLen = generatorBits.length;
  const degree = genLen - 1;
  let remainder = transmittedBits.split('');
  
  for (let i = 0; i <= transmittedBits.length - genLen; i++) {
    if (remainder[i] === '1') {
      for (let j = 0; j < genLen; j++) {
        remainder[i + j] = remainder[i + j] === generatorBits[j] ? '0' : '1';
      }
    }
  }
  
  const finalRemainder = remainder.slice(remainder.length - degree).join('');
  const isValid = !finalRemainder.includes('1');
  
  return {
    isValid,
    finalRemainder,
    hasError: !isValid
  };
}

/**
 * Inject bit flips into a binary bitstream at specified or random indices
 */
export function injectBitErrors(bitstream, errorPositions = []) {
  const bits = bitstream.split('');
  const flipped = [];
  
  errorPositions.forEach(pos => {
    if (pos >= 0 && pos < bits.length) {
      bits[pos] = bits[pos] === '1' ? '0' : '1';
      flipped.push(pos);
    }
  });
  
  return {
    corruptedBits: bits.join(''),
    flippedIndices: flipped
  };
}
