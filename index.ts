import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  createBashTool,
  createEditTool,
  createReadTool,
  createWriteTool,
} from "@earendil-works/pi-coding-agent";

import { VM, RealFSProvider, createHttpHooks } from "@earendil-works/gondolin";

export default function (pi: ExtensionAPI) {
  let vm: VM | null = null;
  const cwd = process.cwd();

  pi.on("session_start", async (_event, _ctx) => {
    const { httpHooks, env } = createHttpHooks({
      allowedHosts: ["*"],
    });

    const vfs = {
      mounts: { [cwd]: new RealFSProvider(cwd) },
    };

    vm = await VM.create({ httpHooks, env, vfs });
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    if (vm) {
      await vm.close();
      vm = null;
    }
  });

  pi.registerTool({
    ...createReadTool(cwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("vm not available");

      const tool = createReadTool(cwd, {
        operations: {
          readFile: async (p) => {
            return await vm!.fs.readFile(p);
          },
          access: async (p) => {
            await vm!.fs.access(p);
          },
        },
      });

      return tool.execute(id, params, signal, onUpdate);
    },
  });

  pi.registerTool({
    ...createWriteTool(cwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("vm not available");

      const tool = createWriteTool(cwd, {
        operations: {
          writeFile: async (p, content) => {
            await vm!.fs.writeFile(p, content);
          },
          mkdir: async (dir) => {
            await vm!.fs.mkdir(dir, {
              recursive: true,
            });
          },
        },
      });

      return tool.execute(id, params, signal, onUpdate);
    },
  });

  pi.registerTool({
    ...createEditTool(cwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("vm not available");

      const tool = createEditTool(cwd, {
        operations: {
          readFile: async (p) => {
            return await vm!.fs.readFile(p);
          },
          access: async (p) => {
            await vm!.fs.access(p);
          },
          writeFile: async (p, content) => {
            await vm!.fs.writeFile(p, content);
          },
        },
      });

      return tool.execute(id, params, signal, onUpdate);
    },
  });

  pi.registerTool({
    ...createBashTool(cwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("vm not available");

      const tool = createBashTool(cwd, {
        operations: {
          exec: async (command, cwd, { onData, signal: signal, env }) => {
            if (!env) throw new Error("env not available");

            const proc = vm!.exec(command, {
              cwd,
              signal,
              env: envRecord(env),
              stdout: "pipe",
              stderr: "pipe",
            });

            for await (const chunk of proc.output()) {
              onData(chunk.data);
            }

            return { exitCode: (await proc).exitCode };
          },
        },
      });

      return tool.execute(id, params, signal, onUpdate);
    },
  });

  function envRecord(env: NodeJS.ProcessEnv): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }
}
