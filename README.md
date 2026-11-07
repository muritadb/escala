# Compasso — escalas 5×2

Aplicação local em português para organizar pessoas, turnos, cobertura e escalas mensais.

## Executar

Requer **Node.js 24.15 ou superior** e npm.

    npm ci
    npm run dev

Abra http://localhost:5174. O comando inicia o Vite na porta 5174 e a API na porta 5175. Ambos escutam somente na interface local. Em desenvolvimento, o Vite encaminha as chamadas de /api à API.

Para servir o build, encerre os servidores de desenvolvimento e execute:

    npm run build
    npm start

O backend serve a interface e a API em http://localhost:5174. Use a mesma origem e o mesmo navegador para a migração de dados antigos.

| Comando            | Finalidade                                                               |
| ------------------ | ------------------------------------------------------------------------ |
| npm run build      | Compilar os workspaces e gerar o frontend de produção                    |
| npm run typecheck  | Verificar os tipos dos workspaces                                        |
| npm run lint       | Verificar o código com ESLint                                            |
| npm test           | Testar o domínio, a interface e a API                                    |
| npm run test:watch | Executar os testes da interface em modo interativo                       |
| npm run test:e2e   | Compilar e verificar o app no Chromium com um banco temporário por teste |
| npm run format     | Formatar código e documentação com Prettier                              |

Instale o Chromium do Playwright com npx playwright install chromium antes de rodar os testes de navegador.

## Organização

- **apps/web** contém as telas React, o calendário editável e o rascunho da escala.
- **apps/api** contém a API Fastify, o armazenamento SQLite e o gerador em uma thread do Node.js.
- **packages/domain** contém as regras de escala, os tipos, os contratos da API e o formato de backup.
- **apps/landing** é o caminho reservado para a futura landing page.

## Dados e backups

A instalação é individual e sem login. O banco padrão fica em **apps/api/data/compasso.sqlite**. Para usar outro arquivo, defina **COMPASSO_DB_PATH** com um caminho absoluto antes de iniciar o app. O banco é criado na primeira execução.

Na primeira abertura com o banco vazio, o Compasso oferece **Importar dados deste navegador** quando encontra dados válidos na chave antiga compasso-v1. Confirme para copiá-los para o SQLite. A cópia antiga continua no navegador. Se os dados estiverem em outro navegador ou origem, abra **Configurações** na barra lateral e selecione **Importar backup**.

Os backups continuam no formato JSON versão 1. **Exportar backup** baixa os dados salvos no banco. **Importar backup** valida o arquivo e pede confirmação para substituir os dados do banco. A revisão aberta permanece na memória da página até ser validada e salva.

Se outra aba gravar primeiro, a revisão do banco impede que a segunda aba sobrescreva os dados. O Compasso mantém o rascunho e oferece **Atualizar dados**. Carregar a versão mais recente pede confirmação antes de descartar o rascunho.

## Escalas

Cadastre turnos e pessoas, ajuste a disponibilidade e preencha a cobertura. Gere a escala, revise o resultado e selecione **Validar e salvar**. A busca no servidor pode durar 5 ou 30 segundos e pode ser cancelada. Excluir um turno transforma suas atribuições em folgas e exige nova validação das escalas afetadas.

As semanas vão de segunda a domingo, com cinco dias de trabalho por pessoa ativa e no máximo um turno por dia. Turnos noturnos pertencem à data de início. O calendário inclui as datas dos meses vizinhos que completam a primeira ou a última semana. Na geração, datas complementares que já estão salvas são preservadas.

A preferência do gerador por folgas no fim de semana considera o histórico. O limite de tempo é distinguido de uma escala inviável.
