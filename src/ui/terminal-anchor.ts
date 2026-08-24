export function anchorTerminalTop(stdout: NodeJS.WriteStream): void {
  if (!stdout.isTTY) return;
  stdout.write("\x1b[H");
}
