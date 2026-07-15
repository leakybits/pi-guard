import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  createBashTool,
  createEditTool,
  createReadTool,
  createWriteTool,
} from "@earendil-works/pi-coding-agent";

import { VM, RealFSProvider, createHttpHooks } from "@earendil-works/gondolin";

export default function (pi: ExtensionAPI) {
  const localCwd = process.cwd();
  let vm: VM | null = null;

  pi.on("session_start", async (_event, _ctx) => {
    const { httpHooks, env } = createHttpHooks({
      allowedHosts: ["*"],
    });

    const vfs = {
      mounts: { [localCwd]: new RealFSProvider(localCwd) },
    };

    vm = await VM.create({
      httpHooks,
      env,
      vfs,
    });
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    if (vm) {
      await vm.close();
      vm = null;
    }
  });

  pi.on("user_bash", (_event, _ctx) => {
    if (!vm) throw new Error("VM not available");

    return {
      operations: {
        async exec(command, cwd, { onData, signal, env }) {
          const proc = vm!.exec(command, {
            cwd,
            env: envToVm(env),
            signal,
            stdout: "pipe",
            stderr: "pipe",
          });

          for await (const chunk of proc.output()) {
            onData(chunk.data);
          }

          return { exitCode: (await proc).exitCode };
        },
      },
    };
  });

  pi.registerTool({
    ...createReadTool(localCwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("VM not available");

      const tool = createReadTool(localCwd, {
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
    ...createWriteTool(localCwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("VM not available");

      const tool = createWriteTool(localCwd, {
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
    ...createEditTool(localCwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("VM not available");

      const tool = createEditTool(localCwd, {
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
    ...createBashTool(localCwd),
    async execute(id, params, signal, onUpdate, _ctx) {
      if (!vm) throw new Error("VM not available");

      const tool = createBashTool(localCwd, {
        operations: {
          exec: async (command, cwd, { onData, signal: execSignal, env }) => {
            const proc = vm!.exec(command, {
              cwd,
              signal: execSignal,
              env: envToVm(env),
              stdout: "pipe",
              stderr: "pipe",
            });
            for await (const chunk of proc.output()) {
              onData(chunk.data);
            }
            const result = await proc;
            return { exitCode: result.exitCode };
          },
        },
      });

      return tool.execute(id, params, signal, onUpdate);
    },
  });

  // --- helpers ---

  function envToVm(env?: NodeJS.ProcessEnv) {
    if (!env) return undefined;

    return Object.entries(env)
      .filter(([, v]) => v !== undefined)
      .flatMap(([k, v]) => [`${k}=${v}`]);
  }
}
