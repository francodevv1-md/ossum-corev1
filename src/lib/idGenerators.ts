// CHATZAI-020A: Counter initialized high to avoid collisions with mock data IDs
// Mock data uses IDs like CX-0001..CX-0006, PR-0001..PR-0006, CONT-0001..CONT-0015 etc.
// Starting at 9000 ensures generated IDs don't collide with hardcoded mock IDs.
let counter = 9000

export function generateId(prefix: string): string {
  counter++
  return `${prefix}-${String(counter).padStart(4, "0")}`
}

export function nowDate(): string {
  return new Date().toISOString().split("T")[0]
}

export function nowTime(): string {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}
