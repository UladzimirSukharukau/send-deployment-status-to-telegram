const core = require("@actions/core");
const github = require("@actions/github");
const https = require("https");

const ENV_PREFIX = process.env.ENV_PREFIX;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_SHA = process.env.GITHUB_SHA;

try {
  const serviceHeader = core.getInput("service-header", { required: true });
  const deploymentTo = ENV_PREFIX || core.getInput("deployment-to", { required: false });
  const botToken = core.getInput("bot-token", { required: true });
  const chatId = core.getInput("chat-id", { required: true });
  const status = core.getInput("status", { required: true });

  if (!deploymentTo) throw new Error("Neither deployment-to argument nor ENV_PREFIX env variable was set");

  let url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&parse_mode=HTML&text=`;
  let text = "";

  const statusStr = status === "success" ? "succeeded" : status === "failure" ? "failed" : "cancelled";
  let header = `<b>${serviceHeader} <a href='https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}'>deployment</a> to ${deploymentTo} ${statusStr}</b>`;
  if (status === "failure") header = `‼️ ${header} ‼️`;
  if (status === "cancelled") header = `❗️ ${header} ❗️`;
  text += header;

  text += `%0A<a href='${github.context.payload.commits[0].url}'>${GITHUB_SHA.substr(0, 7)}</a>`;
  text += ` - <i>${github.context.payload.commits[0].author.name}</i>`;

  let message = github.context.payload.commits[0].message;
  message = message.split("\n")[0];
  message = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  message = message.replace(/[#&/+]/g, (c) => `%${c.charCodeAt(0).toString(16)}`);
  message = message.replace(
    /CR-\d+/g,
    (task) => `<a href='https://crystalroof.atlassian.net/browse/${task}'>${task}</a>`
  );
  message = message.replace(/\(%23\d+\)$/g, (s) => {
    const pr = s.substr(4, s.length - 5);
    return `(<a href='https://github.com/UladzimirSukharukau/CrystalRoof/pull/${pr}'>%23${pr}</a>)`;
  });

  text += `%0A${message}`;

  url += text;

  console.log("URL that will be used:", url);

  https
    .get(url, (resp) => {
      let data = "";

      resp.on("data", (chunk) => {
        data += chunk;
      });

      resp.on("end", () => {
        console.log(JSON.stringify(JSON.parse(data), undefined, 2));
      });
    })
    .on("error", (err) => {
      console.log("Error: " + err.message);
    });
} catch (error) {
  core.setFailed(error.message);
}
