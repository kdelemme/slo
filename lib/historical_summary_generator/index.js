import moment from "moment";
import fs from "fs/promises";

const SIX_DIGITS = 1000000;

function toHighPrecision(value) {
  return Math.round(value * SIX_DIGITS) / SIX_DIGITS;
}

function toErrorBudget(sliValue, objective) {
  const initial = toHighPrecision(1 - objective);
  const consumed = toHighPrecision((1 - sliValue) / initial);
  return {
    initial,
    consumed,
    remaining: toHighPrecision(1 - consumed),
    isEstimated: false,
  };
}

async function generateHistoricalSummary(from, to) {
  const fromMoment = moment.utc(from).startOf("day");

  const data = [];
  let sliValue = 1;
  let counter = 0;
  while (!fromMoment.isAfter(to)) {
    counter++;
    if (counter < 10) {
      data.push({
        date: fromMoment.toISOString(),
        errorBudget: {
          initial: 0.05,
          consumed: 0,
          remaining: 1,
          isEstimated: false,
        },
        sliValue: -1,
        status: "NO_DATA",
      });
    } else {
      sliValue -= 0.005;
      data.push({
        date: fromMoment.toISOString(),
        errorBudget: toErrorBudget(sliValue, 0.95),
        sliValue: toHighPrecision(sliValue),
        status: sliValue < 0.95 ? "FAILED" : "HEALTHY",
      });
    }

    fromMoment.add(1, "day");
  }

  await fs.writeFile(`${__dirname}/data.json`, JSON.stringify(data, null, 2));
}

(async () => {
  await generateHistoricalSummary(
    moment.utc().subtract(30, "day").startOf("day"),
    moment()
  );
})();
