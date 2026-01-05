
import { Scenario } from './types';

// ==========================================
// SCENARIO: 30 EXERCISES (FULL SEED)
// ==========================================
const EXERCISE_SEED = `
  CREATE TABLE Cursos (
    Cur_Codigo INTEGER PRIMARY KEY,
    Cur_Nome TEXT
  );

  CREATE TABLE Professores (
    Prf_Codigo INTEGER PRIMARY KEY,
    Prf_Nome TEXT
  );

  CREATE TABLE Disciplinas (
    Dis_Codigo INTEGER PRIMARY KEY,
    Dis_Nome TEXT,
    Dis_CH INTEGER,
    Cur_Codigo INTEGER,
    Prf_Codigo INTEGER
  );
  
  CREATE TABLE Alunos (
    Alu_Rm INTEGER PRIMARY KEY,
    Alu_Nome TEXT
  );

  CREATE TABLE Aproveitamentos (
    Alu_Rm INTEGER,
    Dis_Codigo INTEGER,
    Apr_Ano INTEGER,
    Apr_Sem INTEGER,
    Apr_Nota REAL,
    Apr_Falta INTEGER
  );

  -- Data Population
  INSERT INTO Cursos VALUES (1, 'Sistemas de Informação'), (2, 'Engenharia de Software'), (3, 'Ciência da Computação');
  
  INSERT INTO Professores VALUES 
  (1, 'Sérgio Borges'), (2, 'Ana Silva'), (3, 'Carlos Souza'), (4, 'Maria Oliveira'), (5, 'Paulo Santos');

  INSERT INTO Disciplinas VALUES 
  (1, 'Lógica de Programação', 80, 1, 1),
  (2, 'Banco de Dados', 80, 1, 1),
  (3, 'Engenharia de Requisitos', 40, 1, 2),
  (4, 'Estrutura de Dados', 80, 2, 3),
  (5, 'Sistemas Operacionais', 60, 2, 4),
  (6, 'Redes de Computadores', 80, 2, 5),
  (7, 'Projeto Integrador', 40, 1, 1),
  (10, 'Matemática Discreta', 80, 3, 2);

  INSERT INTO Alunos VALUES 
  (1, 'João da Silva'), (2, 'Maria Pereira'), (3, 'Pedro Álvares'), 
  (4, 'Ana Clara'), (5, 'Paulo Ricardo'), (6, 'Fernanda Costa'),
  (7, 'Lucas Lima'), (8, 'Patricia Abravanel'), (9, 'Pietra Gomes');

  INSERT INTO Aproveitamentos VALUES
  -- 2023/1
  (1, 1, 2023, 1, 8.0, 4), (1, 2, 2023, 1, 7.0, 0),
  (2, 1, 2023, 1, 5.0, 10), -- Rep Nota
  (3, 1, 2023, 1, 9.0, 22), -- Rep Freq (22/80 > 25%)
  (5, 1, 2023, 1, 8.5, 0),  -- Paulo (RM 5)
  (5, 2, 2023, 1, 9.0, 2),  -- Paulo (RM 5)
  (5, 7, 2023, 1, 10.0, 0), -- Paulo (RM 5)
  
  -- 2023/2
  (1, 1, 2023, 2, 6.0, 0), (2, 2, 2023, 2, 4.0, 0),
  (5, 1, 2023, 2, 7.0, 5),
  
  -- 2024/1
  (1, 1, 2024, 1, 8.0, 0), (2, 1, 2024, 1, 9.0, 0), (3, 1, 2024, 1, 5.5, 0),
  (1, 7, 2024, 1, 8.0, 20), -- Rep Freq in Disc 7 (20/40 = 50% faltas)
  (2, 7, 2024, 1, 9.0, 15), -- Rep Freq in Disc 7
  
  (4, 1, 2024, 1, 2.0, 0), (4, 2, 2024, 1, 3.0, 0), (4, 3, 2024, 1, 1.0, 0), -- Ana failed 3
  
  (6, 1, 2023, 1, 4.0, 0),  -- Rep Nota
  (7, 1, 2023, 1, 8.0, 30), -- Rep Freq
  (8, 1, 2023, 1, 3.0, 30); -- Rep Nota AND Freq
`;

export const SCENARIOS: Scenario[] = [
  {
    id: 'exercises',
    name: '30 Exercícios Práticos',
    description: 'Bateria completa de 30 exercícios para fixação do conteúdo.',
    seedSql: EXERCISE_SEED,
    schema: [
      { tableName: 'Cursos', columns: ['Cur_Codigo', 'Cur_Nome'] },
      { tableName: 'Professores', columns: ['Prf_Codigo', 'Prf_Nome'] },
      { tableName: 'Disciplinas', columns: ['Dis_Codigo', 'Dis_Nome', 'Dis_CH', 'Cur_Codigo', 'Prf_Codigo'] },
      { tableName: 'Alunos', columns: ['Alu_Rm', 'Alu_Nome'] },
      { tableName: 'Aproveitamentos', columns: ['Alu_Rm', 'Dis_Codigo', 'Apr_Ano', 'Apr_Sem', 'Apr_Nota', 'Apr_Falta'] },
    ],
    erdNodes: [
      { id: 'c', x: 50, y: 30, label: 'Cursos', fields: ['#Cur_Codigo', 'Cur_Nome'] },
      { id: 'p', x: 350, y: 30, label: 'Professores', fields: ['#Prf_Codigo', 'Prf_Nome'] },
      { id: 'd', x: 200, y: 200, label: 'Disciplinas', fields: ['#Dis_Codigo', 'Dis_Nome', 'Dis_CH', '#Cur', '#Prf'] },
      { id: 'a', x: 550, y: 200, label: 'Alunos', fields: ['#Alu_Rm', 'Alu_Nome'] },
      { id: 'ap', x: 375, y: 400, label: 'Aproveitamentos', fields: ['#Alu_Rm', '#Dis_Codigo', 'Ano', 'Sem', 'Nota', 'Falta'] },
    ],
    erdEdges: [
      { from: 'c', to: 'd' },
      { from: 'p', to: 'd' },
      { from: 'd', to: 'ap' },
      { from: 'a', to: 'ap' }
    ],
    missions: [
      {
        id: 1, title: "1. Disciplinas do Curso 1",
        desc: "Consultar as disciplinas do curso 1. Apresente: código, nome, carga horária. Ordene pelo nome crescente.",
        expected: "SELECT Dis_Codigo, Dis_Nome, Dis_CH FROM Disciplinas WHERE Cur_Codigo = 1 ORDER BY Dis_Nome ASC;",
        successMessage: "Query simples de seleção com filtro."
      },
      {
        id: 2, title: "2. Disciplinas e Cursos",
        desc: "Consultar disciplinas e respectivos cursos. Apresente: Nome Curso, Código Disc, Nome Disc, Carga Horária. Ordene por Código Disc decrescente.",
        expected: "SELECT c.Cur_Nome, d.Dis_Codigo, d.Dis_Nome, d.Dis_CH FROM Cursos c, Disciplinas d WHERE c.Cur_Codigo = d.Cur_Codigo ORDER BY d.Dis_Codigo DESC;",
        successMessage: "Join implícito dominado."
      },
      {
        id: 3, title: "3. Alunos com 'P'",
        desc: "Alunos que começam com a letra P. Apresente RM e Nome. Ordene por Nome crescente.",
        expected: "SELECT Alu_Rm, Alu_Nome FROM Alunos WHERE Alu_Nome LIKE 'P%' ORDER BY Alu_Nome ASC;",
        successMessage: "Uso correto do LIKE."
      },
      {
        id: 4, title: "4. Histórico RM 5",
        desc: "Disciplinas cursadas pelo RM 5. Apresente: Disc, Prof, Nota, Frequência (%). Ordene por Freq crescente.",
        expected: "SELECT d.Dis_Nome, p.Prf_Nome, a.Apr_Nota, CAST(ROUND((1 - a.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia FROM Aproveitamentos a, Disciplinas d, Professores p WHERE a.Dis_Codigo = d.Dis_Codigo AND d.Prf_Codigo = p.Prf_Codigo AND a.Alu_Rm = 5 ORDER BY (1 - a.Apr_Falta * 1.0 / d.Dis_CH) ASC;",
        successMessage: "Cálculo complexo de frequência!"
      },
      {
        id: 5, title: "5. Alunos na Disc 1",
        desc: "Alunos que cursaram Disc 1. Apresente: Ano, Sem, Nome, Nota, Freq. Ordene por Ano e Sem ascendente.",
        expected: "SELECT ap.Apr_Ano, ap.Apr_Sem, a.Alu_Nome, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia FROM Aproveitamentos ap, Alunos a, Disciplinas d WHERE ap.Dis_Codigo = 1 AND ap.Alu_Rm = a.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo ORDER BY ap.Apr_Ano ASC, ap.Apr_Sem ASC;",
        successMessage: "Relatório de turma gerado."
      },
      {
        id: 6, title: "6. Reprovados por Falta (Disc 7)",
        desc: "Reprovados SOMENTE por falta na Disc 7, 2024/1. (Nota >= 7 mas Freq < 75%). Apresente Nome, Ano, Sem, Nota, Freq.",
        expected: "SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia FROM Aproveitamentos ap, Disciplinas d, Alunos al WHERE ap.Dis_Codigo = 7 AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Alu_Rm = al.Alu_Rm AND (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75 AND ap.Apr_Nota >= 7;",
        successMessage: "Filtro específico de reprovação."
      },
      {
        id: 7, title: "7. Reprovados por Nota (Disc 1)",
        desc: "Reprovados SOMENTE por nota na Disc 1, 2023/2. (Nota < 7 mas Freq >= 75%). Apresente Nome, Ano, Sem, Nota, Freq.",
        expected: "SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia FROM Aproveitamentos ap, Alunos al, Disciplinas d WHERE ap.Dis_Codigo = 1 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 2 AND ap.Alu_Rm = al.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Nota < 7 AND NOT ((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75);",
        successMessage: "Lógica NOT aplicada."
      },
      {
        id: 8, title: "8. Reprovados Nota E Freq",
        desc: "Reprovados por Nota (<7) E Frequência (<75%) na Disc 1, 2023/1.",
        expected: "SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia FROM Aproveitamentos ap, Disciplinas d, Alunos al WHERE ap.Dis_Codigo = 1 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Alu_Rm = al.Alu_Rm AND ap.Apr_Nota < 7 AND (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75;",
        successMessage: "Condição AND dominada."
      },
      {
        id: 9, title: "9. Reprovados Nota OU Freq",
        desc: "Reprovados por Nota (<7) OU Frequência (<75%) na Disc 1, 2023/1. Ordene por Nota crescente.",
        expected: "SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia FROM Aproveitamentos ap, Disciplinas d, Alunos al WHERE ap.Dis_Codigo = 1 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Alu_Rm = al.Alu_Rm AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) ORDER BY ap.Apr_Nota ASC;",
        successMessage: "Condição OR dominada."
      },
      {
        id: 10, title: "10. Média dos Alunos",
        desc: "Média de cada aluno. Apresente RM, Nome, Média. Ordene por média decrescente.",
        expected: "SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm GROUP BY al.Alu_Rm, al.Alu_Nome ORDER BY Media DESC;",
        successMessage: "Agregação AVG e GROUP BY."
      },
      {
        id: 11, title: "11. Média < 7.5",
        desc: "Alunos com média geral < 7.5. Ordene por média decrescente.",
        expected: "SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) < 7.5 ORDER BY Media DESC;",
        successMessage: "Filtro HAVING aplicado."
      },
      {
        id: 12, title: "12. Média >= 7.5 (Complexo)",
        desc: "Média dos alunos com Média >= 7.5 E que cursaram >= 3 disciplinas em 2023/1. Ordene por média crescente.",
        expected: "SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) >= 7.5 AND COUNT(*) >= 3 ORDER BY Media ASC;",
        successMessage: "HAVING com múltiplas condições."
      },
      {
        id: 13, title: "13. Média Disciplinas 2024/1",
        desc: "Média de cada disciplina em 2024/1. Apresente Cod, Nome, Média. Ordene por Nome crescente.",
        expected: "SELECT d.Dis_Codigo, d.Dis_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Disciplinas d WHERE ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY d.Dis_Nome ASC;",
        successMessage: "Agregação por disciplina."
      },
      {
        id: 14, title: "14. Reprovados Disc 2",
        desc: "Reprovados na Disc 2, 2023/1 (Nota < 7 ou Freq < 75%). Mostrar Aluno, Ano, Sem, Nota, Freq, Prof.",
        expected: "SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia, p.Prf_Nome FROM Aproveitamentos ap, Disciplinas d, Alunos al, Professores p WHERE ap.Dis_Codigo = 2 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Alu_Rm = al.Alu_Rm AND d.Prf_Codigo = p.Prf_Codigo AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) ORDER BY al.Alu_Nome ASC;",
        successMessage: "Relatório completo de reprovação."
      },
      {
        id: 15, title: "15. Qtd Reprovações 2023",
        desc: "Qtd reprovações por NOTA (<7) em 2023. Apresente Cod, Nome, Qtd. Ordene por Qtd desc.",
        expected: "SELECT d.Dis_Codigo, d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos ap, Disciplinas d WHERE ap.Apr_Nota < 7 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2023 GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY Qtd DESC;",
        successMessage: "Contagem estatística."
      },
      {
        id: 16, title: "16. Qtd Reprovações 2023/1",
        desc: "Qtd reprovações por NOTA (<7) em 2023/1. Ordene por Qtd desc.",
        expected: "SELECT d.Dis_Codigo, d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos ap, Disciplinas d WHERE ap.Apr_Nota < 7 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY Qtd DESC;",
        successMessage: "Refinamento estatístico."
      },
      {
        id: 17, title: "17. Top 3 Faltosos",
        desc: "Os 3 alunos com mais falta na Disc 1, 2023/1.",
        expected: "SELECT al.Alu_Nome, ap.Apr_Falta, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || '%' as Frequencia FROM Aproveitamentos ap, Alunos al, Disciplinas d WHERE ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = 1 AND ap.Alu_Rm = al.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo ORDER BY Frequencia DESC LIMIT 3;",
        successMessage: "Uso do LIMIT (TOP)."
      },
      {
        id: 18, title: "18. Contagem Alunos Disc 1",
        desc: "Quantidade de alunos na Disc 1, 2023/1.",
        expected: "SELECT COUNT(*) as Qtd FROM Aproveitamentos a WHERE a.Dis_Codigo = 1 AND a.Apr_Ano = 2023 AND a.Apr_Sem = 1;",
        successMessage: "Contagem simples."
      },
      {
        id: 19, title: "19. Carga Aluno 2024/1",
        desc: "Qtd disciplinas cursadas por aluno em 2024/1. Ordene por Nome Aluno desc.",
        expected: "SELECT ap.Alu_Rm, al.Alu_Nome, COUNT(*) as Qtd_Disc FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 GROUP BY ap.Alu_Rm, al.Alu_Nome ORDER BY Qtd_Disc DESC;",
        successMessage: "Análise de carga."
      },
      {
        id: 20, title: "20. Reprovados por Disc 2023/2",
        desc: "Qtd alunos reprovados (Nota<7 OR Freq<75) por disciplina em 2023/2. Ordene por Nome Disc.",
        expected: "SELECT d.Dis_Nome, COUNT(*) as Qtd_Reprovados FROM Aproveitamentos ap, Disciplinas d WHERE ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 2 AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY d.Dis_Nome ASC;",
        successMessage: "Estatística de reprovação."
      },
      {
        id: 21, title: "21. Alunos por Disc 2024/1",
        desc: "Qtd de alunos em cada disciplina em 2024/1. Ordene por Qtd desc.",
        expected: "SELECT d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos ap, Disciplinas d WHERE ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 GROUP BY d.Dis_Nome ORDER BY Qtd DESC;",
        successMessage: "Demanda de disciplinas."
      },
      {
        id: 22, title: "22. Detalhes Curso 1",
        desc: "Disciplinas do Curso 1 com limite de faltas (25%) e Professor.",
        expected: "SELECT d.Dis_Codigo, d.Dis_Nome, d.Dis_CH, (d.Dis_CH * 0.25) as Limite_Faltas, p.Prf_Nome FROM Cursos c, Disciplinas d, Professores p WHERE c.Cur_Codigo = 1 AND d.Cur_Codigo = c.Cur_Codigo AND d.Prf_Codigo = p.Prf_Codigo;",
        successMessage: "Cálculo projetado na coluna."
      },
      {
        id: 23, title: "23. Discs com >2 Reprovados",
        desc: "Disciplinas que reprovaram > 2 alunos em 2024/1. Apresente Cod, Nome, Qtd.",
        expected: "SELECT d.Dis_Codigo, d.Dis_Nome, COUNT(*) as Qtd_Reprovados FROM Aproveitamentos ap, Disciplinas d WHERE ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) GROUP BY d.Dis_Codigo, d.Dis_Nome HAVING COUNT(*) > 2;",
        successMessage: "Filtro HAVING estatístico."
      },
      {
        id: 24, title: "24. Alunos com >1 Reprovação",
        desc: "Alunos reprovados em 2 ou mais disciplinas em 2024/1. Apresente RM, Nome, Qtd.",
        expected: "SELECT al.Alu_Rm, al.Alu_Nome, COUNT(*) as Qtd_Reprovacao FROM Aproveitamentos ap, Alunos al, Disciplinas d WHERE ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 AND ap.Alu_Rm = al.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) GROUP BY al.Alu_Rm, al.Alu_Nome HAVING COUNT(*) >= 2 ORDER BY al.Alu_Nome ASC;",
        successMessage: "Identificação de alunos críticos."
      },
      {
        id: 25, title: "25. Profs com >= 3 Discs",
        desc: "Professores que ministram 3 ou mais disciplinas.",
        expected: "SELECT p.Prf_Codigo, p.Prf_Nome, COUNT(*) as Qtd FROM Disciplinas d, Professores p WHERE d.Prf_Codigo = p.Prf_Codigo GROUP BY p.Prf_Codigo, p.Prf_Nome HAVING COUNT(*) >= 3;",
        successMessage: "Análise de carga docente."
      },
      {
        id: 26, title: "26. Discs Populares (>2 Alunos)",
        desc: "Disciplinas cursadas por >= 3 alunos em 2023/2.",
        expected: "SELECT d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos a, Disciplinas d WHERE a.Apr_Ano = 2023 AND a.Apr_Sem = 2 AND a.Dis_Codigo = d.Dis_Codigo GROUP BY d.Dis_Codigo, d.Dis_Nome HAVING COUNT(*) >= 3 ORDER BY Qtd DESC;",
        successMessage: "Análise de turmas."
      },
      {
        id: 27, title: "27. Discs por Curso",
        desc: "Quantidade de disciplinas de cada curso.",
        expected: "SELECT c.Cur_Nome, COUNT(*) as Qtd FROM Cursos c, Disciplinas d WHERE c.Cur_Codigo = d.Cur_Codigo GROUP BY c.Cur_Nome ORDER BY c.Cur_Nome ASC;",
        successMessage: "Estrutura curricular."
      },
      {
        id: 28, title: "28. Média Notas > 3",
        desc: "Média do aluno considerando apenas notas > 3. Ordene por Média desc.",
        expected: "SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Alunos al, Aproveitamentos ap, Disciplinas d WHERE al.Alu_Rm = ap.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Nota > 3 GROUP BY al.Alu_Rm, al.Alu_Nome ORDER BY Media DESC;",
        successMessage: "Filtro pré-agregação."
      },
      {
        id: 29, title: "29. Média Filtrada > 8",
        desc: "Média (de notas > 5) dos alunos cuja média calculada é > 8.",
        expected: "SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Alunos al, Aproveitamentos ap, Disciplinas d WHERE al.Alu_Rm = ap.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Nota > 5 GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) > 8 ORDER BY Media ASC;",
        successMessage: "Filtro pré e pós agregação."
      },
      {
        id: 30, title: "30. Filtro Complexo de Média",
        desc: "Média (notas > 2 e < 8) dos alunos com média final > 5.",
        expected: "SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Alunos al, Aproveitamentos ap, Disciplinas d WHERE al.Alu_Rm = ap.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND (ap.Apr_Nota > 2 AND ap.Apr_Nota < 8) GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) > 5 ORDER BY Media DESC;",
        successMessage: "Domínio total de SQL."
      }
    ]
  }
];
