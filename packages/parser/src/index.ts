import { xdr, scValToNative } from '@stellar/stellar-sdk';
import { ParserError } from '@soroban-indexer/shared';
import { SorobanEvent } from '@soroban-indexer/types';

/**
 * Parses a base64 encoded XDR ScVal string into a native JavaScript value
 */
export function parseScValToNative(scValBase64: string): unknown {
  try {
    const val = xdr.ScVal.fromXDR(scValBase64, 'base64');
    return scValToNative(val);
  } catch (err) {
    throw new ParserError('Failed to parse ScVal XDR', err);
  }
}

/**
 * Parses a raw Soroban event from base64 XDR strings into a structured SorobanEvent object
 */
export function parseSorobanEvent(
  rawEvent: {
    id: string;
    contractId: string;
    type: 'contract' | 'system' | 'diagnostic';
    topics: string[];
    value: string;
  },
  txHash: string,
  ledgerSeq: number,
  timestamp: number
): SorobanEvent {
  try {
    // Decode and parse topics
    const parsedTopics = rawEvent.topics.map((t) => {
      const val = xdr.ScVal.fromXDR(t, 'base64');
      const native = scValToNative(val);
      if (native instanceof Uint8Array || Buffer.isBuffer(native)) {
        return Buffer.from(native).toString('hex');
      }
      return typeof native === 'object' && native !== null
        ? JSON.stringify(native)
        : String(native);
    });

    // Decode and parse values
    const rawVal = xdr.ScVal.fromXDR(rawEvent.value, 'base64');
    const parsedValue = scValToNative(rawVal);
    let stringifiedValue: string;

    if (parsedValue instanceof Uint8Array || Buffer.isBuffer(parsedValue)) {
      stringifiedValue = Buffer.from(parsedValue).toString('hex');
    } else {
      stringifiedValue =
        typeof parsedValue === 'object' && parsedValue !== null
          ? JSON.stringify(parsedValue)
          : String(parsedValue);
    }

    return {
      id: rawEvent.id,
      contractId: rawEvent.contractId,
      type: rawEvent.type,
      topics: parsedTopics,
      value: stringifiedValue,
      transactionHash: txHash,
      ledgerSequence: ledgerSeq,
      timestamp,
    };
  } catch (err) {
    throw new ParserError(`Failed to parse Soroban event ${rawEvent.id}`, err);
  }
}
