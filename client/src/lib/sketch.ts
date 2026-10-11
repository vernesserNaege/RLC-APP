// A safe Arduino sketch name from the code title (the part before ":") or the step title.
// "LED Blink: turns the LED..." -> "LED_Blink"   "2 LEDs" -> "Sketch_2_LEDs"
// Arduino names must start with a letter, use only letters, numbers and _, max 63 characters.
export function sketchName(codeTitle: string | null, stepTitle: string): string {
  const words = (codeTitle?.split(":")[0] || stepTitle).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!words) return "RLC_Sketch";
  return (/^[A-Za-z]/.test(words) ? words : `Sketch_${words}`).slice(0, 63);
}