import { Record, Plaintext, Struct } from "../src/data";
import { Transaction } from "../src/transaction";
import { parseValueToJson } from "../src/parsers/plaintext";

import { actualTxFromAPI, exampleSquashRecord, exampleAuctionRecord } from "./test-data";



test("Record type matches auction record structure", () => {
  const record: Record = exampleAuctionRecord;

  expect(record.owner.startsWith("aleo1")).toBe(true);
  expect(typeof record.bid).toBe("object");

  if (record.bid && typeof record.bid === "object" && "amount" in record.bid) {
    const amount = (record.bid as Struct).amount;
    if (typeof amount === "string") {
      expect(amount.endsWith("u64.private")).toBe(true);
    } else {
      throw new Error("record.bid.amount is not a string");
    }
  } else {
    throw new Error("record.bid is not a valid Struct with amount");
  }

  expect(record._nonce.endsWith("group.public")).toBe(true);
});


test("fails if owner address is invalid", () => {
  const badRecord = {
    ...exampleAuctionRecord,
    owner: "badownerstring",
  };

  expect(badRecord.owner.startsWith("aleo1")).toBe(false);
});
// @ts-expect-error - owner must be a string
const badOwner: Record = {
  ...exampleAuctionRecord,
  // @ts-expect-error - owner must be a string
  owner: 12345,
};

// @ts-expect-error - auction_id must be a string (field)
const badAuctionId: Record = {
  ...exampleAuctionRecord,
  auction_id: true,
};

test("Squash record matches expected Record structure", () => {
  const record: Record = exampleSquashRecord;

  expect(record.owner.startsWith("aleo1")).toBe(true);
  expect(record.kg.endsWith("u64.private")).toBe(true);
  expect(record.last_water.endsWith("u64.private")).toBe(true);
  expect(record.level.endsWith("u8.private")).toBe(true);
  expect(record.squash_name.endsWith("u128.private")).toBe(true);
  expect(record.squash_id.endsWith("u32.private")).toBe(true);
  expect(record._nonce.endsWith("group.public")).toBe(true);
});


test("actualTxFromAPI matches Transaction type and has valid structure", () => {
  const tx: Transaction = actualTxFromAPI;

  expect(tx.type).toBe("execute");
  expect(typeof tx.id).toBe("string");

  expect(tx.execution?.transitions.length).toBeGreaterThan(0);

  const transition = tx.execution?.transitions[0];
  expect(transition?.program).toBe("credits.aleo");
  expect(transition?.function).toBe("transfer_public");
});

test("parses simple u64 plaintext from mapping", () => {
  const raw = "1000000u64";
  const parsed = parseValueToJson(raw);

  expect(typeof parsed).toBe("string");
  expect(parsed.endsWith("u64")).toBe(true);
});

test("parses simple u64 plaintext from mapping", () => {
  const raw = "1000000u64";
  const parsed: Plaintext = parseValueToJson(raw);

  expect(typeof parsed).toBe("string");
  if (typeof parsed === "string") {
    expect(parsed.endsWith("u64")).toBe(true);
  }
});