const [command, phase] = process.argv.slice(2);

console.error(`${command ?? "This command"} is introduced in Phase ${phase ?? "a later phase"}; the current mock UI performs no external operation.`);
process.exitCode = 1;
