// The school logo (NU shield). The file is in client/public, so Vite serves it at /nu-shield.png
// and it is bundled with the app (it works offline on the Pi too).
export default function Logo() {
  return <img className="logo-image" src="/nu-shield.png" alt="" width="44" height="44" />;
}