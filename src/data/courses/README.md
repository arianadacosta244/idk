# Cursos

Cada curso é um ficheiro `.json` nesta pasta. `index.ts` carrega automaticamente
todos os ficheiros `*.json` presentes (via `import.meta.glob`) — não é preciso
tocar em nenhum código para adicionar um curso novo, basta criar o ficheiro.

## Como adicionar um curso

1. Vai ao plano de estudos oficial do curso em [sigarra.up.pt](https://sigarra.up.pt)
   (Cursos/CE → &lt;faculdade&gt; → &lt;curso&gt; → Planos de Estudos → Plano Oficial).
2. Cria `<id-do-curso>.json` nesta pasta, seguindo o schema:

```json
{
  "id": "l-eic",
  "name": "Licenciatura em Engenharia Informática e Computação",
  "shortName": "L.EIC",
  "units": [
    { "code": "L.EIC001", "name": "Álgebra Linear e Geometria Analítica", "ects": 4.5, "year": 1, "semester": 1 }
  ]
}
```

- `id`: slug único, kebab-case (é a chave usada para guardar dados no `localStorage`).
- `name`: nome completo do curso.
- `shortName`: sigla curta (ex. `L.EIC`), usada nos sítios com pouco espaço.
- `units`: uma entrada por UC do plano oficial, incluindo optativas/UCs de
  competências transversais (usa um `code` inventado e estável tipo
  `<CURSO>-CT1` para slots sem código oficial, como grupos de opções).
- `ects`: número, pode ter casas decimais (ex. `4.5`).
- `year` / `semester`: `1`–`3` (ou mais, se o curso tiver mais anos) e `1` ou `2`.

3. Confirma que a soma de `ects` bate certo com o total de ECTS do ciclo de
   estudos (tipicamente `180` para uma licenciatura de 3 anos).

Não é preciso registar o curso em mais lado nenhum — o `index.ts` desta pasta
apanha o ficheiro automaticamente na próxima vez que a app arrancar.
