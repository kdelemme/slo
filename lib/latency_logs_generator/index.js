import assert from "assert";
import { add, sub, isBefore, isAfter, isEqual } from "date-fns";
import pkg from "date-fns-tz";
const { formatInTimeZone } = pkg;

import { getEsClient, waitFor } from "../common.js";
import indexTemplate from "./index_template.json" assert { type: "json" };

const INTERVAL = process.env.INTERVAL || 5;

function generateData(date) {
  const isGood = Math.random() <= 0.9 ? true : false;

  // latency is either good, e.g. between [0; 100] or bad, e.g. between [300, 600]
  const latency = isGood ? Math.random() * 100 : Math.random() * 300 + 300;

  return {
    "@timestamp": formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:ss.000'Z'"),
    dataset: "latency",
    label: "latency",
    message: "some important message",
    latency: Math.round(latency),
  };
}

async function generatePreviousData({ startDate, endDate }) {
  const esClient = getEsClient();
  let docs = [];
  let currentDate = startDate;

  while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
    docs.push({
      index: "service-logs-latency",
      ...generateData(currentDate),
    });
    currentDate = add(currentDate, { seconds: INTERVAL });
  }

  const result = await esClient.helpers.bulk({
    datasource: docs,
    onDocument(doc) {
      return {
        index: {
          _index: "service-logs-latency",
        },
      };
    },
  });

  console.log(
    "inserted %d/%d historical documents in %dms from %s to %s",
    result.total,
    result.successful,
    result.time,
    startDate.toISOString(),
    endDate.toISOString()
  );
}

async function generateNewData(toDate) {
  const esClient = getEsClient();
  let lastDate = toDate;

  while (true) {
    const now = new Date();
    if (isAfter(now, lastDate)) {
      lastDate = now;
      const data = generateData(now);
      const res = await esClient.index({
        index: "service-logs-latency",
        document: data,
      });
      assert(res.result === "created");

      console.log(
        `[%s] inserted 1 document with latency [%d]`,
        now.toISOString(),
        data.latency
      );
    }

    await waitFor(INTERVAL * 1000);
  }
}

async function createTemplateIfNeeded() {
  const esClient = getEsClient();

  await esClient.indices.putTemplate(
    { name: `service-logs-template`, body: indexTemplate },
    { ignore: [409] }
  );
}

// node index.js
(async function () {
  const now = new Date();
  const range = { startDate: sub(now, { days: 30 }), endDate: now };

  const docsPerDay = (60 / INTERVAL) * 60 * 24;

  await createTemplateIfNeeded();

  await generatePreviousData(range);
  await generateNewData(now);
})();