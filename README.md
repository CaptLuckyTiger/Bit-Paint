# Bit Paint

Editor de imagens raster executado inteiramente no navegador, inspirado no
Microsoft Paint. O projeto usa HTML, CSS, JavaScript modular (ES6+) e a API
Canvas 2D, sem frameworks, backend ou dependências externas.

## Como executar

Como a aplicação usa módulos ES, execute-a por meio de um servidor HTTP local.
No PowerShell, a partir da pasta do projeto, por exemplo:

```powershell
npm start
```

Depois, abra <http://localhost:8000>.
O servidor fica acessível apenas neste computador. Como alternativa, execute
`python -m http.server 8000 --bind 127.0.0.1` diretamente.

## Recursos

- Interface compacta em português, inspirada na faixa de opções do Paint.
- Lápis, pincel, borracha, spray, marcador, giz de cera e pincéis texturizados.
- Pincéis a óleo, aquarela, natural e caligráfico.
- Linhas, retângulos, retângulos arredondados, elipses, triângulos, losangos,
  estrelas, pentágonos, hexágonos, paralelogramos, trapézios, triângulos
  retângulos, setas, balões, corações, nuvens, relâmpagos e cilindros.
- Formas com contorno e preenchimento.
- Balde de preenchimento com tolerância de cores.
- Conta-gotas, texto com fonte, tamanho, negrito e itálico.
- Texto editável em uma caixa sobre o canvas, com múltiplas linhas, confirmação
  e cancelamento antes da rasterização. A caixa pode ser movida pela barra
  superior e redimensionada pela alça no canto inferior direito.
- Seleção retangular persistente, movimentação, redimensionamento por alças,
  copiar, recortar, colar, excluir e selecionar tudo.
- Desfazer e refazer com atalhos de teclado.
- Redimensionar a imagem escalando o conteúdo, cortar, girar e inverter.
- Filtros de escala de cinza, inversão de cores, sépia, brilho e contraste.
- Zoom, ajuste à janela e indicação de coordenadas do cursor.
- Lupa por clique (use `Shift` + clique para reduzir) e grade visual para alinhamento.
- Importação de PNG, JPEG e WebP.
- Colagem de imagens e prints diretamente da área de transferência do sistema
  usando `Ctrl+V` ou o botão **Colar**, preservando a resolução original;
  o canvas mantém seu tamanho quando já é maior e expande quando necessário.
- Alças nos quatro cantos e nos lados da área de trabalho para redimensionar
  largura e altura; uma prévia suave mostra o novo limite e a operação só é
  aplicada ao soltar o mouse, podendo ser desfeita.
- Exportação para PNG, JPEG e WebP.
- Canvas com suporte a mouse, toque e caneta por Pointer Events.
- Imagens transparentes, novo desenho com tamanho e fundo escolhidos e
  exportação JPEG/WebP com qualidade ajustável.
- Instalação como PWA e uso offline depois do primeiro carregamento online.

## Instalar e usar offline

Sirva o projeto por HTTP em `localhost` ou HTTPS e abra-o uma vez enquanto
estiver online. O service worker guarda a interface e os módulos do editor para
abrir novamente sem conexão. O navegador oferece a instalação quando o suporte
está disponível.

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

Ferramentas: `P` lápis, `B` pincel, `E` borracha, `G` preencher,
`I` conta-gotas, `T` texto, `M` seleção e `Z` lupa.

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

Apache-2.0. Consulte o arquivo [LICENSE](./LICENSE).
