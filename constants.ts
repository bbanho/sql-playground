
// ==========================================
// SYSTEM BOOTSTRAP SQL
// This defines the "Meta" layer of the application
// ==========================================

export const BOOTSTRAP_SQL = `
  -- 1. System Tables
  CREATE TABLE IF NOT EXISTS System_Scenarios (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    seed_sql TEXT
  );

  CREATE TABLE IF NOT EXISTS System_Missions (
    id INTEGER PRIMARY KEY,
    scenario_id TEXT,
    title TEXT,
    description TEXT,
    expected_sql TEXT,
    success_message TEXT,
    order_index INTEGER,
    FOREIGN KEY(scenario_id) REFERENCES System_Scenarios(id)
  );

  CREATE TABLE IF NOT EXISTS System_Progress (
    scenario_id TEXT,
    mission_id INTEGER,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_query TEXT,
    PRIMARY KEY (scenario_id, mission_id)
  );

  -- 2. Scenario Data (The Exercise Environment)
  -- We store the creation SQL as a string to be executed when the scenario loads
  INSERT INTO System_Scenarios (id, name, description, seed_sql) VALUES 
  ('exercises', '30 Exercícios Práticos', 'Bateria completa de 30 exercícios para fixação do conteúdo.', 
  'CREATE TABLE IF NOT EXISTS Cursos (Cur_Codigo INTEGER PRIMARY KEY, Cur_Nome TEXT);
   CREATE TABLE IF NOT EXISTS Professores (Prf_Codigo INTEGER PRIMARY KEY, Prf_Nome TEXT);
   CREATE TABLE IF NOT EXISTS Disciplinas (Dis_Codigo INTEGER PRIMARY KEY, Dis_Nome TEXT, Dis_CH INTEGER, Cur_Codigo INTEGER, Prf_Codigo INTEGER);
   CREATE TABLE IF NOT EXISTS Alunos (Alu_Rm INTEGER PRIMARY KEY, Alu_Nome TEXT);
   CREATE TABLE IF NOT EXISTS Aproveitamentos (Alu_Rm INTEGER, Dis_Codigo INTEGER, Apr_Ano INTEGER, Apr_Sem INTEGER, Apr_Nota REAL, Apr_Falta INTEGER);
   
   DELETE FROM Aproveitamentos; DELETE FROM Alunos; DELETE FROM Disciplinas; DELETE FROM Professores; DELETE FROM Cursos;

   INSERT INTO Cursos VALUES (1, ''Sistemas de Informação''), (2, ''Engenharia de Software''), (3, ''Ciência da Computação'');
   INSERT INTO Professores VALUES (1, ''Sérgio Borges''), (2, ''Ana Silva''), (3, ''Carlos Souza''), (4, ''Maria Oliveira''), (5, ''Paulo Santos'');
   INSERT INTO Disciplinas VALUES (1, ''Lógica de Programação'', 80, 1, 1), (2, ''Banco de Dados'', 80, 1, 1), (3, ''Engenharia de Requisitos'', 40, 1, 2), (4, ''Estrutura de Dados'', 80, 2, 3), (5, ''Sistemas Operacionais'', 60, 2, 4), (6, ''Redes de Computadores'', 80, 2, 5), (7, ''Projeto Integrador'', 40, 1, 1), (10, ''Matemática Discreta'', 80, 3, 2);
   INSERT INTO Alunos VALUES (1, ''João da Silva''), (2, ''Maria Pereira''), (3, ''Pedro Álvares''), (4, ''Ana Clara''), (5, ''Paulo Ricardo''), (6, ''Fernanda Costa''), (7, ''Lucas Lima''), (8, ''Patricia Abravanel''), (9, ''Pietra Gomes'');
   INSERT INTO Aproveitamentos VALUES 
   (1, 1, 2023, 1, 8.0, 4), (1, 2, 2023, 1, 7.0, 0), (2, 1, 2023, 1, 5.0, 10), (3, 1, 2023, 1, 9.0, 22), (5, 1, 2023, 1, 8.5, 0), (5, 2, 2023, 1, 9.0, 2), (5, 7, 2023, 1, 10.0, 0),
   (1, 1, 2023, 2, 6.0, 0), (2, 2, 2023, 2, 4.0, 0), (5, 1, 2023, 2, 7.0, 5),
   (1, 1, 2024, 1, 8.0, 0), (2, 1, 2024, 1, 9.0, 0), (3, 1, 2024, 1, 5.5, 0), (1, 7, 2024, 1, 8.0, 20), (2, 7, 2024, 1, 9.0, 15), (4, 1, 2024, 1, 2.0, 0), (4, 2, 2024, 1, 3.0, 0), (4, 3, 2024, 1, 1.0, 0), (6, 1, 2023, 1, 4.0, 0), (7, 1, 2023, 1, 8.0, 30), (8, 1, 2023, 1, 3.0, 30);'
  ) ON CONFLICT DO NOTHING;

  -- 3. Missions Data
  INSERT INTO System_Missions (id, scenario_id, title, description, expected_sql, success_message, order_index) VALUES
  (1, 'exercises', '1. Disciplinas do Curso 1', 'Consultar as disciplinas do curso 1. Apresente: código, nome, carga horária. Ordene pelo nome crescente.', 'SELECT Dis_Codigo, Dis_Nome, Dis_CH FROM Disciplinas WHERE Cur_Codigo = 1 ORDER BY Dis_Nome ASC;', 'Query simples de seleção com filtro.', 1),
  (2, 'exercises', '2. Disciplinas e Cursos', 'Consultar disciplinas e respectivos cursos. Apresente: Nome Curso, Código Disc, Nome Disc, Carga Horária. Ordene por Código Disc decrescente.', 'SELECT c.Cur_Nome, d.Dis_Codigo, d.Dis_Nome, d.Dis_CH FROM Cursos c, Disciplinas d WHERE c.Cur_Codigo = d.Cur_Codigo ORDER BY d.Dis_Codigo DESC;', 'Join implícito dominado.', 2),
  (3, 'exercises', '3. Alunos com ''P''', 'Alunos que começam com a letra P. Apresente RM e Nome. Ordene por Nome crescente.', 'SELECT Alu_Rm, Alu_Nome FROM Alunos WHERE Alu_Nome LIKE ''P%'' ORDER BY Alu_Nome ASC;', 'Uso correto do LIKE.', 3),
  (4, 'exercises', '4. Histórico RM 5', 'Disciplinas cursadas pelo RM 5. Apresente: Disc, Prof, Nota, Frequência (%). Ordene por Freq crescente.', 'SELECT d.Dis_Nome, p.Prf_Nome, a.Apr_Nota, CAST(ROUND((1 - a.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia FROM Aproveitamentos a, Disciplinas d, Professores p WHERE a.Dis_Codigo = d.Dis_Codigo AND d.Prf_Codigo = p.Prf_Codigo AND a.Alu_Rm = 5 ORDER BY (1 - a.Apr_Falta * 1.0 / d.Dis_CH) ASC;', 'Cálculo complexo de frequência!', 4),
  (5, 'exercises', '5. Alunos na Disc 1', 'Alunos que cursaram Disc 1. Apresente: Ano, Sem, Nome, Nota, Freq. Ordene por Ano e Sem ascendente.', 'SELECT ap.Apr_Ano, ap.Apr_Sem, a.Alu_Nome, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia FROM Aproveitamentos ap, Alunos a, Disciplinas d WHERE ap.Dis_Codigo = 1 AND ap.Alu_Rm = a.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo ORDER BY ap.Apr_Ano ASC, ap.Apr_Sem ASC;', 'Relatório de turma gerado.', 5),
  (6, 'exercises', '6. Reprovados por Falta (Disc 7)', 'Reprovados SOMENTE por falta na Disc 7, 2024/1. (Nota >= 7 mas Freq < 75%). Apresente Nome, Ano, Sem, Nota, Freq.', 'SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia FROM Aproveitamentos ap, Disciplinas d, Alunos al WHERE ap.Dis_Codigo = 7 AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Alu_Rm = al.Alu_Rm AND (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75 AND ap.Apr_Nota >= 7;', 'Filtro específico de reprovação.', 6),
  (7, 'exercises', '7. Reprovados por Nota (Disc 1)', 'Reprovados SOMENTE por nota na Disc 1, 2023/2. (Nota < 7 mas Freq >= 75%). Apresente Nome, Ano, Sem, Nota, Freq.', 'SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia FROM Aproveitamentos ap, Alunos al, Disciplinas d WHERE ap.Dis_Codigo = 1 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 2 AND ap.Alu_Rm = al.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Nota < 7 AND NOT ((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75);', 'Lógica NOT aplicada.', 7),
  (8, 'exercises', '8. Reprovados Nota E Freq', 'Reprovados por Nota (<7) E Frequência (<75%) na Disc 1, 2023/1.', 'SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia FROM Aproveitamentos ap, Disciplinas d, Alunos al WHERE ap.Dis_Codigo = 1 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Alu_Rm = al.Alu_Rm AND ap.Apr_Nota < 7 AND (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75;', 'Condição AND dominada.', 8),
  (9, 'exercises', '9. Reprovados Nota OU Freq', 'Reprovados por Nota (<7) OU Frequência (<75%) na Disc 1, 2023/1. Ordene por Nota crescente.', 'SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia FROM Aproveitamentos ap, Disciplinas d, Alunos al WHERE ap.Dis_Codigo = 1 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Alu_Rm = al.Alu_Rm AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) ORDER BY ap.Apr_Nota ASC;', 'Condição OR dominada.', 9),
  (10, 'exercises', '10. Média dos Alunos', 'Média de cada aluno. Apresente RM, Nome, Média. Ordene por média decrescente.', 'SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm GROUP BY al.Alu_Rm, al.Alu_Nome ORDER BY Media DESC;', 'Agregação AVG e GROUP BY.', 10),
  (11, 'exercises', '11. Média < 7.5', 'Alunos com média geral < 7.5. Ordene por média decrescente.', 'SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) < 7.5 ORDER BY Media DESC;', 'Filtro HAVING aplicado.', 11),
  (12, 'exercises', '12. Média >= 7.5 (Complexo)', 'Média dos alunos com Média >= 7.5 E que cursaram >= 3 disciplinas em 2023/1. Ordene por média crescente.', 'SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) >= 7.5 AND COUNT(*) >= 3 ORDER BY Media ASC;', 'HAVING com múltiplas condições.', 12),
  (13, 'exercises', '13. Média Disciplinas 2024/1', 'Média de cada disciplina em 2024/1. Apresente Cod, Nome, Média. Ordene por Nome crescente.', 'SELECT d.Dis_Codigo, d.Dis_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Aproveitamentos ap, Disciplinas d WHERE ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY d.Dis_Nome ASC;', 'Agregação por disciplina.', 13),
  (14, 'exercises', '14. Reprovados Disc 2', 'Reprovados na Disc 2, 2023/1 (Nota < 7 ou Freq < 75%). Mostrar Aluno, Ano, Sem, Nota, Freq, Prof.', 'SELECT al.Alu_Nome, ap.Apr_Ano, ap.Apr_Sem, ap.Apr_Nota, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia, p.Prf_Nome FROM Aproveitamentos ap, Disciplinas d, Alunos al, Professores p WHERE ap.Dis_Codigo = 2 AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND al.Alu_Rm = ap.Alu_Rm AND d.Prf_Codigo = p.Prf_Codigo AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) ORDER BY al.Alu_Nome ASC;', 'Relatório completo de reprovação.', 14),
  (15, 'exercises', '15. Qtd Reprovações 2023', 'Qtd reprovações por NOTA (<7) em 2023. Apresente Cod, Nome, Qtd. Ordene por Qtd desc.', 'SELECT d.Dis_Codigo, d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos ap, Disciplinas d WHERE ap.Apr_Nota < 7 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2023 GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY Qtd DESC;', 'Contagem estatística.', 15),
  (16, 'exercises', '16. Qtd Reprovações 2023/1', 'Qtd reprovações por NOTA (<7) em 2023/1. Ordene por Qtd desc.', 'SELECT d.Dis_Codigo, d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos ap, Disciplinas d WHERE ap.Apr_Nota < 7 AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY Qtd DESC;', 'Refinamento estatístico.', 16),
  (17, 'exercises', '17. Top 3 Faltosos', 'Os 3 alunos com mais falta na Disc 1, 2023/1.', 'SELECT al.Alu_Nome, ap.Apr_Falta, CAST(ROUND((1 - ap.Apr_Falta * 1.0 / d.Dis_CH) * 100, 1) AS TEXT) || ''%'' as Frequencia FROM Aproveitamentos ap, Alunos al, Disciplinas d WHERE ap.Apr_Ano = 2023 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = 1 AND ap.Alu_Rm = al.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo ORDER BY Frequencia DESC LIMIT 3;', 'Uso do LIMIT (TOP).', 17),
  (18, 'exercises', '18. Contagem Alunos Disc 1', 'Quantidade de alunos na Disc 1, 2023/1.', 'SELECT COUNT(*) as Qtd FROM Aproveitamentos a WHERE a.Dis_Codigo = 1 AND a.Apr_Ano = 2023 AND a.Apr_Sem = 1;', 'Contagem simples.', 18),
  (19, 'exercises', '19. Carga Aluno 2024/1', 'Qtd disciplinas cursadas por aluno em 2024/1. Ordene por Nome Aluno desc.', 'SELECT ap.Alu_Rm, al.Alu_Nome, COUNT(*) as Qtd_Disc FROM Aproveitamentos ap, Alunos al WHERE ap.Alu_Rm = al.Alu_Rm AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 GROUP BY ap.Alu_Rm, al.Alu_Nome ORDER BY Qtd_Disc DESC;', 'Análise de carga.', 19),
  (20, 'exercises', '20. Reprovados por Disc 2023/2', 'Qtd alunos reprovados (Nota<7 OR Freq<75) por disciplina em 2023/2. Ordene por Nome Disc.', 'SELECT d.Dis_Nome, COUNT(*) as Qtd_Reprovados FROM Aproveitamentos ap, Disciplinas d WHERE ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2023 AND ap.Apr_Sem = 2 AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) GROUP BY d.Dis_Codigo, d.Dis_Nome ORDER BY d.Dis_Nome ASC;', 'Estatística de reprovação.', 20),
  (21, 'exercises', '21. Alunos por Disc 2024/1', 'Qtd de alunos em cada disciplina em 2024/1. Ordene por Qtd desc.', 'SELECT d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos ap, Disciplinas d WHERE ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 GROUP BY d.Dis_Nome ORDER BY Qtd DESC;', 'Demanda de disciplinas.', 21),
  (22, 'exercises', '22. Detalhes Curso 1', 'Disciplinas do Curso 1 com limite de faltas (25%) e Professor.', 'SELECT d.Dis_Codigo, d.Dis_Nome, d.Dis_CH, (d.Dis_CH * 0.25) as Limite_Faltas, p.Prf_Nome FROM Cursos c, Disciplinas d, Professores p WHERE c.Cur_Codigo = 1 AND d.Cur_Codigo = c.Cur_Codigo AND d.Prf_Codigo = p.Prf_Codigo;', 'Cálculo projetado na coluna.', 22),
  (23, 'exercises', '23. Discs com >2 Reprovados', 'Disciplinas que reprovaram > 2 alunos em 2024/1. Apresente Cod, Nome, Qtd.', 'SELECT d.Dis_Codigo, d.Dis_Nome, COUNT(*) as Qtd_Reprovados FROM Aproveitamentos ap, Disciplinas d WHERE ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 AND ap.Dis_Codigo = d.Dis_Codigo AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) GROUP BY d.Dis_Codigo, d.Dis_Nome HAVING COUNT(*) > 2;', 'Filtro HAVING estatístico.', 23),
  (24, 'exercises', '24. Alunos com >1 Reprovação', 'Alunos reprovados em 2 ou mais disciplinas em 2024/1. Apresente RM, Nome, Qtd.', 'SELECT al.Alu_Rm, al.Alu_Nome, COUNT(*) as Qtd_Reprovacao FROM Aproveitamentos ap, Alunos al, Disciplinas d WHERE ap.Apr_Ano = 2024 AND ap.Apr_Sem = 1 AND ap.Alu_Rm = al.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND (ap.Apr_Nota < 7 OR (1 - ap.Apr_Falta * 1.0 / d.Dis_CH) < 0.75) GROUP BY al.Alu_Rm, al.Alu_Nome HAVING COUNT(*) >= 2 ORDER BY al.Alu_Nome ASC;', 'Identificação de alunos críticos.', 24),
  (25, 'exercises', '25. Profs com >= 3 Discs', 'Professores que ministram 3 ou mais disciplinas.', 'SELECT p.Prf_Codigo, p.Prf_Nome, COUNT(*) as Qtd FROM Disciplinas d, Professores p WHERE d.Prf_Codigo = p.Prf_Codigo GROUP BY p.Prf_Codigo, p.Prf_Nome HAVING COUNT(*) >= 3;', 'Análise de carga docente.', 25),
  (26, 'exercises', '26. Discs Populares (>2 Alunos)', 'Disciplinas cursadas por >= 3 alunos em 2023/2.', 'SELECT d.Dis_Nome, COUNT(*) as Qtd FROM Aproveitamentos a, Disciplinas d WHERE a.Apr_Ano = 2023 AND a.Apr_Sem = 2 AND a.Dis_Codigo = d.Dis_Codigo GROUP BY d.Dis_Codigo, d.Dis_Nome HAVING COUNT(*) >= 3 ORDER BY Qtd DESC;', 'Análise de turmas.', 26),
  (27, 'exercises', '27. Discs por Curso', 'Quantidade de disciplinas de cada curso.', 'SELECT c.Cur_Nome, COUNT(*) as Qtd FROM Cursos c, Disciplinas d WHERE c.Cur_Codigo = d.Cur_Codigo GROUP BY c.Cur_Nome ORDER BY c.Cur_Nome ASC;', 'Estrutura curricular.', 27),
  (28, 'exercises', '28. Média Notas > 3', 'Média do aluno considerando apenas notas > 3. Ordene por Média desc.', 'SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Alunos al, Aproveitamentos ap, Disciplinas d WHERE al.Alu_Rm = ap.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Nota > 3 GROUP BY al.Alu_Rm, al.Alu_Nome ORDER BY Media DESC;', 'Filtro pré-agregação.', 28),
  (29, 'exercises', '29. Média Filtrada > 8', 'Média (de notas > 5) dos alunos cuja média calculada é > 8.', 'SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Alunos al, Aproveitamentos ap, Disciplinas d WHERE al.Alu_Rm = ap.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND ap.Apr_Nota > 5 GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) > 8 ORDER BY Media ASC;', 'Filtro pré e pós agregação.', 29),
  (30, 'exercises', '30. Filtro Complexo de Média', 'Média (notas > 2 e < 8) dos alunos com média final > 5.', 'SELECT al.Alu_Rm, al.Alu_Nome, ROUND(AVG(ap.Apr_Nota), 2) as Media FROM Alunos al, Aproveitamentos ap, Disciplinas d WHERE al.Alu_Rm = ap.Alu_Rm AND ap.Dis_Codigo = d.Dis_Codigo AND (ap.Apr_Nota > 2 AND ap.Apr_Nota < 8) GROUP BY al.Alu_Rm, al.Alu_Nome HAVING AVG(ap.Apr_Nota) > 5 ORDER BY Media DESC;', 'Domínio total de SQL.', 30)
  ON CONFLICT DO NOTHING;
`;
