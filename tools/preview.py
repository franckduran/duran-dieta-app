# Junta o app num único HTML para a prévia (sem service worker nem manifest).
import re, sys
root, out = sys.argv[1], sys.argv[2]
html = open(f'{root}/index.html').read()
body = html.split('<!--APP-->')[1].split('<!--/APP-->')[0]
css = open(f'{root}/css/app.css').read() + '\n' + open(f'{root}/css/recursos.css').read()
js = open(f'{root}/js/data.js').read() + '\n' + open(f'{root}/js/app.js').read()
page = ('<title>Minha Dieta</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        f'<style>\n{css}\n</style>\n{body}\n<script>\n{js.replace("</script", "<\\/script")}\n</script>\n')
open(out, 'w').write(page)
