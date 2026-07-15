import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  createBashTool,
  createEditTool,
  createReadTool,
  createWriteTool,
} from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const localCwd = process.cwd();

  pi.on("session_start", async (_event, _ctx) => {
    // Create a VM and mount the local cwd at a guest path (e.g. /workspace).
    throw new Error("Not implemented");
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    // Close the VM and clear the cached instance.
    throw new Error("Not implemented");
  });

  pi.on("before_agent_start", async (_event, _ctx) => {
    // Ensure the VM is running, then rewrite the system prompt's CWD line
    // so the model sees the guest path instead of the host path.
    throw new Error("Not implemented");
  });

  pi.on("user_bash", (_event, _ctx) => {
    // Return { operations } with a VM-backed BashOperations so "!" commands run in the VM.
    throw new Error("Not implemented");
  });

  pi.registerTool({
    ...createReadTool(localCwd),
    async execute(_id, _params, _signal, _onUpdate, _ctx) {
      // Ensure the VM is running, create a read tool with VM-backed operations,
      // and delegate to it.
      throw new Error("Not implemented");
    },
  });

  pi.registerTool({
    ...createWriteTool(localCwd),
    async execute(_id, _params, _signal, _onUpdate, _ctx) {
      // Ensure the VM is running, create a write tool with VM-backed operations,
      // and delegate to it.
      throw new Error("Not implemented");
    },
  });

  pi.registerTool({
    ...createEditTool(localCwd),
    async execute(_id, _params, _signal, _onUpdate, _ctx) {
      // Ensure the VM is running, create an edit tool with VM-backed operations,
      // and delegate to it.
      throw new Error("Not implemented");
    },
  });

  pi.registerTool({
    ...createBashTool(localCwd),
    async execute(_id, _params, _signal, _onUpdate, _ctx) {
      // Ensure the VM is running, create a bash tool with VM-backed operations,
      // and delegate to it.
      throw new Error("Not implemented");
    },
  });
}
