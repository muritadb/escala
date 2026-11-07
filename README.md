# Compasso — escalas 5×2

Aplicação local em português para organizar pessoas, turnos, cobertura e escalas mensais. React + TypeScript + Vite, com Tailwind CSS pelo plugin oficial do Vite.

## Executar

Requer Node.js **22.12 ou superior** e npm.

```sh
npm ci
npm run dev
```

Abra **http://localhost:5174**. A porta é fixa: se estiver ocupada, encerre o processo responsável antes de iniciar. `npm start` é um alias de `npm run dev`.

| Comando              | Finalidade                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| `npm run build`      | Verificar tipos e gerar a aplicação em `dist/`                            |
| `npm run preview`    | Servir o build na mesma porta, sem executar o servidor de desenvolvimento |
| `npm run typecheck`  | Verificar TypeScript em modo estrito                                      |
| `npm run lint`       | Verificar o código com ESLint                                             |
| `npm test`           | Executar os testes de domínio, armazenamento e componentes                |
| `npm run test:watch` | Executar Vitest em modo interativo                                        |
| `npm run test:e2e`   | Testar o build em Chromium, incluindo desktop e celular                   |
| `npm run format`     | Formatar código e documentação com Prettier                               |

Para testar no navegador, execute `npx playwright install chromium` e `npm run build` antes de `npm run test:e2e`. O Playwright inicia e encerra o preview; a porta 5174 precisa estar livre. Em Linux, se faltarem bibliotecas do navegador, instale as dependências do Chromium conforme indicado pelo Playwright.

## Organização

- `src/app`: composição da aplicação, Context e reducer. Dados persistidos e revisão da escala são separados.
- `src/components`: layout, avisos, confirmação acessível e classes compartilhadas.
- `src/features`: telas de pessoas, turnos, cobertura e escala; componentes e hook específicos ficam junto à funcionalidade.
- `src/domain`: tipos e regras puras, datas, validação, remoção de turno e resolvedor. Não depende de React, DOM ou armazenamento.
- `src/infrastructure`: leitura e gravação local, validação de backups, importação e exportação.
- `src/workers`: protocolo tipado do gerador em Web Worker.
- `src/styles/global.css`: Tailwind, tokens de cores e tipografia e estilos base. Componentes usam classes utilitárias; as cores dos turnos vêm de um mapa estático.
- `tests`: testes de domínio, infraestrutura, interface com Testing Library e testes de produção com Playwright.

O servidor artesanal e os módulos JavaScript anteriores foram substituídos. O lockfile mantém as versões instaladas reproduzíveis.

## Dados e backups

A chave **`compasso-v1`**, a versão **1** e o formato JSON anterior foram preservados. Dados existentes são validados e carregados sem migração destrutiva. Uma leitura inválida não sobrescreve o conteúdo salvo.

Os dados pertencem à origem do navegador: use o mesmo navegador e **http://localhost:5174** para recuperar os dados anteriores. Alterar host, protocolo ou porta cria outro armazenamento. Exporte um backup antes de mudar a origem ou limpar o navegador.

Não há login, backend ou sincronização. Os backups contêm apenas os dados salvos, sem a revisão em andamento. Importações exigem confirmação e são validadas antes de substituir os dados. Falhas de gravação exibem um aviso para exportar um backup.

## Funcionamento

Cadastre turnos e pessoas, ajuste a disponibilidade e preencha a cobertura dos dias abertos. Gere uma escala, revise e selecione **Validar e salvar**. Ajustes manuais inválidos permanecem apenas na revisão. Descartar a revisão preserva a escala salva. Excluir um turno exige confirmação, limpa suas referências e transforma as atribuições desse turno em folgas; as escalas afetadas precisam de nova validação.

Semanas vão de segunda a domingo, com cinco dias por pessoa ativa e no máximo um turno por dia. Não há limite adicional de dias consecutivos entre semanas. Turnos noturnos pertencem à data de início; término igual ao início representa 24 horas. As semanas nas bordas do mês são completas e datas já salvas de outros meses são preservadas.

O resolvedor usa busca com retrocesso e poda por cobertura em um worker. A preferência por folgas aos finais de semana considera o histórico, sem garantir ótimo global. A busca dura até 5 ou 30 segundos; limite de tempo é distinto de inviabilidade comprovada. Cancelamento, conclusão e desmontagem da tela encerram o worker.

A fonte Barlow é opcional: sem acesso ao Google Fonts, a interface utiliza fontes do sistema.
