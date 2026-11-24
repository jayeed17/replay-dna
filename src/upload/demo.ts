import type { InputFile } from '../loaders'

/** Fetch the bundled fake dataset from public/sample/ as InputFiles. */
export async function demoFiles(): Promise<InputFile[]> {
  const base = `${import.meta.env.BASE_URL}sample/`
  const res = await fetch(`${base}manifest.json`)
  if (!res.ok) throw new Error('Demo data not found')
  const names: string[] = await res.json()
  return names.map((name) => ({
    name,
    text: async () => {
      const r = await fetch(base + encodeURIComponent(name))
      if (!r.ok) throw new Error(`Could not load ${name}`)
      return r.text()
    },
  }))
}
