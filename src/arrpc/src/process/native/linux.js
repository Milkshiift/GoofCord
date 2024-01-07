import { readdir, readFile } from "fs/promises";

export const getProcesses = async () => {
  let pids = (await readdir("/proc")).filter((f) => !isNaN(+f));
  return (
    await Promise.all(
      pids.map((pid) =>
        readFile(`/proc/${pid}/cmdline`, "utf8").then(
          (path) => [+pid, path.replace(/\0/g, "")],
          () => {}
        )
      )
    )
  ).filter((x) => x);
};
