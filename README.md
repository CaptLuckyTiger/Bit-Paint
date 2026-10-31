# Bit Paint

Editor de imagens raster executado inteiramente no navegador, inspirado no
Microsoft Paint. O projeto usa HTML, CSS, JavaScript modular (ES6+) e a API
Canvas 2D, sem frameworks, backend ou dependências externas.

## Como executar

Como a aplicação usa módulos ES, execute-a por meio de um servidor HTTP local.
No PowerShell, a partir da pasta do projeto, por exemplo:

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/'||req.url==='')file=path.join(root,'index.html');fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.end(data);});}).listen(8000)"
```

Depois, abra <http://localhost:8000>.

## Recursos

- Interface compacta em português, inspirada na faixa de opções do Paint.
- Lápis, pincel, borracha, spray, marcador, giz de cera e pincéis texturizados.
- Pincéis a óleo, aquarela, natural e caligráfico.
- Linhas, retângulos, retângulos arredondados, elipses, triângulos, losangos,
  estrelas, setas e balões.
- Formas com contorno e preenchimento.
- Balde de preenchimento com tolerância de cores.
- Conta-gotas, texto com fonte, tamanho, negrito e itálico.
- Seleção retangular persistente, movimentação, redimensionamento por alças,
  copiar, recortar, colar, excluir e selecionar tudo.
- Desfazer e refazer com atalhos de teclado.
- Redimensionar, cortar, girar e inverter a imagem.
- Zoom, ajuste à janela e indicação de coordenadas do cursor.
- Importação de PNG, JPEG e WebP.
- Exportação para PNG, JPEG e WebP.
- Canvas com suporte a mouse, toque e caneta por Pointer Events.

## Atalhos

| Ação | Atalho |
| --- | --- |
| Desfazer | `Ctrl+Z` |
| Refazer | `Ctrl+Y` |
| Copiar | `Ctrl+C` |
| Colar | `Ctrl+V` |
| Selecionar tudo | `Ctrl+A` |
| Abrir | `Ctrl+O` |
| Salvar | `Ctrl+S` |
| Novo | `Ctrl+N` |
| Imprimir | `Ctrl+P` |
| Excluir seleção | `Delete` |

## Estrutura

```text
index.html
css/
  canvas.css
  style.css
  toolbar.css
js/
  canvas.js
  colors.js
  drawing.js
  file-manager.js
  history.js
  main.js
```

## Licença

Consulte o arquivo [LICENSE](./LICENSE).
