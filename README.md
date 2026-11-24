# Retorno Comercial de Validade

Área do comercial para responder os produtos sinalizados no Controle de Validade.

## Telas

- **Dashboard** — itens no controle, vencendo, vencidos, aguardando retorno
- **Retorno comercial** — somente os itens **sem retorno**; botão Responder
- **Produtos no controle** — listagem completa (somente leitura) com filtros e impressão

## Banco

Mesma tabela `val_itens` do Controle de Validade: ao responder, grava
`retorno`, `data_retorno`, `nome_retorno` e muda o `status` para `respondido`.

Permissões pelo módulo **validade** do Controle de Acesso.
