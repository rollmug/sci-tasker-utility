// ////////////////////////////////////////////////////////////////////////////
// NOTES
// ////////////////////////////////////////////////////////////////////////////
// Sample package.json
// {
//   "name": "tasker",
//   "version": "1.0.0",
//   "displayName": "Tasker Utility",
//   "description": "Simple background task to receive and perform sleep and reboot commands. Run as root.",
//   "main": "tasker.js",
//   "author": "Greg Sprick, RLMG <greg@rlmg.com>",
//   "license": "MIT",
//   "engines": {
//     "node": ">=20.6.15",
//     "npm": ">=6.4"
//   }
// }

// Sample config.json
// {
//   "port": 7003,
//   "address": "0.0.0.0"
// }

// ////////////////////////////////////////////////////////////////////////////
// IMPORTS
// ////////////////////////////////////////////////////////////////////////////
import dgram from "node:dgram";
import process from "node:process";
import os from "node:os";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { exec } from "node:child_process";

const acyncExec = promisify(exec);

// ////////////////////////////////////////////////////////////////////////////
// CONFIGURATION CLASS
// ////////////////////////////////////////////////////////////////////////////
class Config {
  constructor() {
    // Start with default values
    this.port = 7003;
    this.host = "0.0.0.0"; // 'localhost' is internal only. '0.0.0.0' is all external network connections

    // Overwrite from config file, if present
    try {
      const json = readFileSync(new URL("./config.json", import.meta.url), {
        encoding: "utf8",
      });
      const config = JSON.parse(json);
      if (config.port) this.port = config.port;
      if (Object.hasOwn(config, "host")) this.host = config.host;
    } catch (error) {
      if (error.code !== "ENOENT") {
        // ignore ENOENT (no file exists)
        throw error;
      }
    }

    // Overwrite with environmental variables
    // these can be inported from a .env file with the --env-file=.env command line argument
    if (process.env.TASKER_PORT) this.port = process.env.TASKER_PORT;
    if (process.env.TASKER_HOST) this.host = process.env.TASKER_HOST;

    // Overwrite with command line arguments
    process.argv.forEach((value, index, array) => {
      if (value === "-p" || value === "-port" || value === "--port") {
        if (index < array.length)
          this.port = parseInt(array[index + 1]) || this.port;
      }
      if (value === "-a" || value === "-address" || value === "--address") {
        if (index < array.length) this.host = array[index + 1];
      }
    });
  }

  getPort() {
    return this.port;
  }

  getAddress() {
    return this.address;
  }
}

// ////////////////////////////////////////////////////////////////////////////
// UDP SERVER CLASS
// ////////////////////////////////////////////////////////////////////////////
class UDPServer {
  constructor() {
    this.socket = dgram.createSocket("udp4");

    this.socket.on("error", (err) => {
      console.error(`server error:\n${err.stack}`);
      socket.close();
    });

    this.socket.on("message", (msg, rinfo) => {
      // assume I get commands similar to a terminal
      // break into an array of lines and comvert each line into command, args
      // listen for 'message', 'line', and 'command'
      const data = msg.toString("utf8");
      console.log(
        `server received: ${data
          .replaceAll("\n", "<LF>")
          .replaceAll("\r", "<CR>")} from ${rinfo.address}:${rinfo.port}`
      );
      const lines = data
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");
      lines.forEach((line) => {
        this.socket.emit("line", line);
        const [cmd, ...args] = line.split(" ");
        this.socket.emit("command", cmd, args.join(" "));
      });
    });

    this.socket.on("listening", () => {
      const address = this.socket.address();
      console.log(`server listening on ${address.address}:${address.port}`);
    });
  }

  getSocket() {
    return this.socket;
  }
}

// ////////////////////////////////////////////////////////////////////////////
// MISC FUNCTIONS
// ////////////////////////////////////////////////////////////////////////////
function getActiveNetworkInterfaces() {
  // creates a list of available IP addresses, removing disabled ones
  const filterdInterfaces = {};
  for (const [name, configs] of Object.entries(os.networkInterfaces())) {
    let foundConfig = configs.find(
      (config) =>
        config.family === "IPv4" &&
        !config.internal &&
        config.address &&
        config.mac !== "00:00:00:00:00:00"
    );
    if (foundConfig) {
      filterdInterfaces[name] = foundConfig;
    }
  }
  return filterdInterfaces;
}

async function sleep() {
  let cmd;
  if (os.platform() === "win32")
    cmd = "rundll32.exe powrprof.dll, SetSuspendState 0,1,0";
  else if (os.platform() === "darwin") cmd = "shutdown -s now";
  else if (os.platform() === "linux") cmd = "systemctl suspend";
  else cmd = "sudo shutdown -s now";

  const { stdout, stderr } = await acyncExec(cmd, { windowHide: true });
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  return stdout;
}

async function shutdown() {
  let cmd;
  if (os.platform() === "win32") cmd = "shutdown /s /t 0";
  else if (os.platform() === "darwin") cmd = "shutdown -h now";
  else cmd = "sudo shutdown -h now";

  const { stdout, stderr } = await acyncExec(cmd, { windowHide: true });
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  return stdout;
}

async function reboot() {
  let cmd;
  if (os.platform() === "win32") cmd = "shutdown /r /t 0";
  else if (os.platform() === "darwin") cmd = "shutdown -r now";
  else cmd = "sudo shutdown -r now";

  const { stdout, stderr } = await acyncExec(cmd, { windowHide: true });
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  return stdout;
}

async function doCommand(cmd, args) {
  // called by a callback when a new command is received
  try {
    switch (cmd) {
      case "ping":
        console.log("pong");
        break;
      case "beep":
        process.stdout.write("\x07");
        break;
      case "sleep":
        console.log(`command started: ${cmd} ${args}`);
        await sleep();
        console.log(`command completed`);
        break;
      case "shutdown":
        console.log(`command started: ${cmd} ${args}`);
        await shutdown();
        console.log(`command completed`);
        break;
      case "reboot":
        console.log(`command started: ${cmd} ${args}`);
        await reboot();
        console.log(`command completed`);
        break;
      default:
        console.log(`unknown command: ${cmd} ${args}`);
        break;
    }
  } catch (error) {
    console.error(error.message);
  }
}

// ////////////////////////////////////////////////////////////////////////////
// MAIN
// ////////////////////////////////////////////////////////////////////////////

// get config data
const opts = new Config();

// set i[ the UDP server
const server = new UDPServer();
server.socket.bind(opts.port, opts.host);

// add a callback to handle commands received by the server
server.socket.on("command", doCommand);

// log a list of available IP addresses ( and MAC addresses) for refernece
console.log("available network interfaces");
for (const [key, value] of Object.entries(getActiveNetworkInterfaces())) {
  console.log(`  ${key}: ${value.address} (${value.mac})`);
}
