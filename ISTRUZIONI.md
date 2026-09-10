# Setup completo per Studio-Mix-Mobile — istruzioni

Questo pacchetto contiene TUTTO quello che serve: il codice sorgente
dell'app (che nel repo Studio-Mix-Mobile mancava) + il progetto Android +
il workflow GitHub Actions corretto per generare l'APK automaticamente.

## Attenzione: file nascosti

La cartella `.github/` inizia con un punto: su Mac, Finder la nasconde di
default (probabile causa del problema precedente). Per vederla in Finder:
Cmd+Shift+Punto. Meglio ancora: usa il terminale come descritto sotto, così
non rischi di perderla di nuovo.

## Cosa fare (da terminale, il modo più sicuro)

1. Estrai questo zip, es. in una cartella chiamata `studio_mix_pkg`.
2. Apri il terminale e vai nella cartella del repo locale `Studio-Mix-Mobile`
   (quella con dentro `.git`).
3. Lancia questo comando, sostituendo il percorso con quello reale della
   cartella estratta:
   ```
   cp -r /percorso/studio_mix_pkg/. .
   ```
   Il `.` finale (dopo lo spazio) è importante: copia TUTTO, compresi i
   file e le cartelle nascoste come `.github/`, dentro la cartella corrente.
   Su Windows PowerShell, posizionati allo stesso modo nella cartella del
   repo e lancia:
   ```
   Copy-Item -Path "C:\percorso\studio_mix_pkg\*" -Destination "." -Recurse -Force
   Copy-Item -Path "C:\percorso\studio_mix_pkg\.github" -Destination ".\.github" -Recurse -Force
   Copy-Item -Path "C:\percorso\studio_mix_pkg\.gitignore" -Destination "." -Force
   ```
   (PowerShell con `*` da solo non prende i file che iniziano con il punto,
   per questo la seconda e terza riga li copiano a parte).
4. Verifica: `git status` — dovresti vedere come nuovi/modificati `src/`,
   `public/`, `index.html`, `vite.config.ts`, `tsconfig.json`,
   `capacitor.config.json`, `.gitignore`, e soprattutto
   `.github/workflows/android.yml`.
5. Se non vedi `.github/workflows/android.yml` nell'elenco, il file non è
   stato copiato: ripeti il passaggio 3, controllando il percorso.
6. Quando `git status` mostra tutto correttamente:
   ```
   git add .
   git commit -m "Add app source, Android project and CI build"
   git push
   ```
7. Vai su GitHub → repo Studio-Mix-Mobile → tab Actions: la run
   "Build Android APK" parte da sola. A fine run, l'APK è scaricabile
   dalla sezione Artifacts.

Ho già verificato in locale che il progetto builda senza errori prima di
mandartelo.
