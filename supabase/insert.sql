-- ============================================================
-- INSERTAR DATOS EN EL MODELO NORMALIZADO 1:N
-- IDs renumerados desde 1
-- Tabla PADRE: "grados-informaticos".filas
-- Tabla HIJA:  "grados-informaticos".archivos (fila_id FK)
-- Ejecutar en Supabase: SQL Editor -> New query -> RUN
-- ============================================================

-- 1. FILAS (temas/secciones completas)
INSERT INTO "grados-informaticos".filas
  (id, rama, asignatura, trimestre, seccion, nombre, actualizado_en, visible)
VALUES
-- XALO T1 apuntes
(1, 'Primer_grado_medio','XALO','1','apuntes','UD1 - INTRODUCCIÓN A LA REDES DE ÁREA LOCAL','2026-08-19 00:42:52.551+00',false),
(2, 'Primer_grado_medio','XALO','', 'apuntes','UD1.2 - ISO PARTICIONES Y MÁQUINAS VIRTUALES','2026-08-18 22:47:29.968+00',false),
(3, 'Primer_grado_medio','XALO','1','apuntes','UD1.2 - ISO PARTICIONES Y MÁQUINAS VIRTUALES','2026-08-18 22:53:54.576+00',true),
(4, 'Primer_grado_medio','XALO','', 'apuntes','UD2 -LA CAPA FÍSICA','2026-08-18 22:47:41.512+00',true),
(5, 'Primer_grado_medio','XALO','1','apuntes','UD2 -LA CAPA FÍSICA','2026-08-18 22:52:55.815+00',false),
(6, 'Primer_grado_medio','XALO','1','apuntes','PRÁCTICA 1 - USUARIOS , GESTIÓN DE PARTICIONES Y SISTEMAS OPERATIVOS.','2026-08-18 22:56:25.51+00',true),
(7, 'Primer_grado_medio','XALO','1','apuntes','[ACTIVITAT 1] VELOCIDAD, DIFUSIÓN I CONMUTACIÓN','2026-08-18 22:56:30.518+00',true),
(8, 'Primer_grado_medio','XALO','1','apuntes','[ACTIVITAT 2] CONCEPTOS','2026-08-18 22:56:34.318+00',true),
-- XALO T1 practicas
(9, 'Primer_grado_medio','XALO','1','practicas','PRÁCTICA 1 - USUARIOS , GESTIÓN DE PARTICIONES Y SISTEMAS OPERATIVOS.','2026-08-18 22:56:44.368+00',true),
(10,'Primer_grado_medio','XALO','1','practicas','[ACTIVITAT 1] VELOCIDAD, DIFUSIÓN I CONMUTACIÓN','2026-08-18 22:56:44.368+00',true),
(11,'Primer_grado_medio','XALO','1','practicas','[ACTIVITAT 2] CONCEPTOS','2026-08-18 22:56:44.368+00',true),
(12,'Primer_grado_medio','XALO','1','practicas','[ACTIVIDAD] EJERCICIOS DE LA CAPA FÍSICA','2026-08-18 22:56:44.368+00',true),
(13,'Primer_grado_medio','XALO','1','practicas','[ACTIVIDAD] CABLES','2026-08-18 22:56:44.368+00',true),
(14,'Primer_grado_medio','XALO','1','practicas','[EJERCICIO DE REPASO] CALCULO DE VELOCIDADES','2026-08-18 22:56:44.368+00',true),
-- SOM T1 apuntes
(15,'Primer_grado_medio','SOM','1','apuntes','UD-0 INTRODUCCIÓN','2026-08-18 22:58:10.659+00',true),
(16,'Primer_grado_medio','SOM','1','apuntes','UD.1-HISTORIA','2026-08-18 22:58:46.19+00',true),
(17,'Primer_grado_medio','SOM','1','apuntes','UD.2-VIRTUALIZACIÓN Y SISTEMAS OPERATIVOS','2026-08-18 22:59:16.66+00',true),
(18,'Primer_grado_medio','SOM','1','apuntes','UD2.2-Presentación','2026-08-18 23:01:02.247+00',true),
(19,'Primer_grado_medio','SOM','1','apuntes','UD2.3-Virtualbox y SlitaZ','2026-08-18 23:01:43.019+00',true),
-- SOM T1 practicas
(20,'Primer_grado_medio','SOM','1','practicas','UD2.2-Presentación','2026-08-18 23:01:08.902+00',true),
(21,'Primer_grado_medio','SOM','1','practicas','1.4-Actividades','2026-08-18 23:01:25.964+00',true),
(22,'Primer_grado_medio','SOM','1','practicas','UD2.3-Virtualbox y SlitaZ','2026-08-18 23:01:27.647+00',true),
-- MMDE T1 apuntes
(23,'Primer_grado_medio','MMDE','1','apuntes','UD5 - CONVERSIONES DE MEDIDAS DE LA INFORMÁTICA','2026-08-18 23:07:32.67+00',false),
(24,'Primer_grado_medio','MMDE','1','apuntes','UD1 - INTRODUCCIÓN A LOS EQUIPOS Y SISTEMAS INFORMÁTICOS','2026-08-18 23:07:32.67+00',false),
-- MMDE T1 practicas
(25,'Primer_grado_medio','MMDE','1','practicas','EJERCICIO TEMA 2.3.1','2026-08-18 23:02:42.638+00',true),
(26,'Primer_grado_medio','MMDE','1','practicas','TRABAJO 1','2026-08-18 23:02:42.638+00',true),
(27,'Primer_grado_medio','MMDE','1','practicas','TRABAJO 2','2026-08-18 23:02:42.638+00',true),
(28,'Primer_grado_medio','MMDE','1','practicas','TRABAJO 3','2026-08-18 23:02:42.638+00',true),
(29,'Primer_grado_medio','MMDE','1','practicas','TRABAJO 4','2026-08-18 23:02:42.638+00',true),
(30,'Primer_grado_medio','MMDE','1','practicas','TRABAJO 5','2026-08-18 23:02:42.638+00',true),
(31,'Primer_grado_medio','MMDE','1','practicas','TRABAJO 6','2026-08-18 23:02:42.638+00',true),
(32,'Primer_grado_medio','MMDE','1','practicas','ACTIVIDAD 3.1','2026-08-18 23:02:42.638+00',true),
-- FOL T1 apuntes
(33,'Primer_grado_medio','FOL','1','apuntes','UD2-MATERIAL PREVENCIÓN DE RIESGOS LABORALES','2026-08-18 23:07:17.087+00',false),
(34,'Primer_grado_medio','FOL','1','apuntes','1-Matriz DAFO','2026-08-18 23:08:30.84+00',true),
(35,'Primer_grado_medio','FOL','1','apuntes','Análisis película Steve Jobs','2026-08-18 23:09:50.962+00',true),
(36,'Primer_grado_medio','FOL','1','apuntes','CV Y CARTA DE PRESENTACIÓN','2026-08-18 23:15:48.631+00',false),
-- FOL T1 practicas
(37,'Primer_grado_medio','FOL','1','practicas','1-Matriz DAFO','2026-08-18 23:08:52.249+00',true),
(38,'Primer_grado_medio','FOL','1','practicas','Test de las inteligencias múltiples','2026-08-18 23:08:52.249+00',true),
(39,'Primer_grado_medio','FOL','1','practicas','Análisis película Steve Jobs','2026-08-18 23:08:52.249+00',true),
(40,'Primer_grado_medio','FOL','1','practicas','CV Y CARTA DE PRESENTACIÓN','2026-08-18 23:16:02.247+00',false),
(41,'Primer_grado_medio','FOL','1','practicas','Soft skills','2026-08-18 23:16:31.613+00',false),
-- APOF T1 apuntes
(42,'Primer_grado_medio','APOF','1','apuntes','Git/github','2026-08-18 23:21:33.918+00',true),
(43,'Primer_grado_medio','APOF','1','apuntes','Javascript','2026-08-18 23:22:13.389+00',true),
(44,'Primer_grado_medio','APOF','1','apuntes','1-INICI','2026-08-18 23:23:14.595+00',true),
(45,'Primer_grado_medio','APOF','1','apuntes','2-Documents de Text','2026-08-18 23:24:28.875+00',false),
-- APOF T1 practicas
(46,'Primer_grado_medio','APOF','1','practicas','1-INICI','2026-08-18 23:22:49.497+00',true),
(47,'Primer_grado_medio','APOF','1','practicas','2-Documents de Text','2026-08-18 23:24:33.884+00',false),
(48,'Primer_grado_medio','APOF','1','practicas','3-Python','2026-08-18 23:22:49.497+00',true),
-- XALO T2 apuntes
(49,'Primer_grado_medio','XALO','2','apuntes','UD2.2 - GESTIÓN DE USUARIOS Y GRUPOS.','2026-08-18 23:27:41.893+00',true),
(50,'Primer_grado_medio','XALO','2','apuntes','UD3.2 - PROPIEDAD, CONTROL DE ACCESO Y TIPOS DE PERMISOS','2026-08-18 23:28:00.539+00',true),
-- XALO T2 practicas
(51,'Primer_grado_medio','XALO','2','practicas','[Ejercicio] Direcciones MAC','2026-08-18 23:28:13.648+00',true),
(52,'Primer_grado_medio','XALO','2','practicas','[Ejercicio] Identificación de las partes de una trama Ethernet','2026-08-18 23:28:13.648+00',true),
(53,'Primer_grado_medio','XALO','2','practicas','[Práctica] Simulación de ARP en Packet Tracer','2026-08-18 23:28:13.648+00',true),
(54,'Primer_grado_medio','XALO','2','practicas','[Ejercicio] Código de Humming','2026-08-18 23:28:13.648+00',true),
(55,'Primer_grado_medio','XALO','2','practicas','[Entrega opcional] Paridad vertical y horizontal','2026-08-18 23:28:13.648+00',true),
(56,'Primer_grado_medio','XALO','2','practicas','[Ejercicio] Operaciones bit a bit y máscaras','2026-08-18 23:28:13.648+00',true),
(57,'Primer_grado_medio','XALO','2','practicas','[Ejercicio entregable] Detección de errores con códigos de Hamming','2026-08-18 23:28:13.648+00',true),
(58,'Primer_grado_medio','XALO','2','practicas','[Ejercicio] IPv4','2026-08-18 23:28:13.648+00',true),
(59,'Primer_grado_medio','XALO','2','practicas','[Ejercicio PacketTracer] Asignación IP estáticas','2026-08-18 23:28:13.648+00',true),
-- XALO T3 apuntes
(60,'Primer_grado_medio','XALO','3','apuntes','UD4.2  - CONSOLA ORDENES WINDOWS','2026-08-18 23:37:11.882+00',true),
(61,'Primer_grado_medio','XALO','3','apuntes','UD5.2 -  GRUPO DE TRABAJO','2026-08-18 23:37:11.882+00',true),
(62,'Primer_grado_medio','XALO','3','apuntes','UD5 - LA CAPA DE TRANSPORTE','2026-08-18 23:37:15.114+00',false),
-- XALO T3 practicas
(63,'Primer_grado_medio','XALO','3','practicas','4.3-EJERCICIO ESTRUCTURA DIRECTORIOS','2026-08-18 23:37:20.735+00',true),
(64,'Primer_grado_medio','XALO','3','practicas','4.1-EJERCICIO ESTRUCTURA DIRECTORIOS','2026-08-18 23:37:20.735+00',true),
(65,'Primer_grado_medio','XALO','3','practicas','PRÁCTICA 4 - CONSOLA ÓRDENES WINDOWS','2026-08-18 23:37:20.735+00',true),
(66,'Primer_grado_medio','XALO','3','practicas','PRÁCTICA 5 - GRUPOS DE TRABAJO','2026-08-18 23:37:20.735+00',true),
(67,'Primer_grado_medio','XALO','3','practicas','4.2-EJERCICIO ESTRUCTURA DIRECTORIOS','2026-08-18 23:37:20.735+00',true),
(68,'Primer_grado_medio','XALO','3','practicas','[Ejercicios 2] Subnetting normal','2026-08-18 23:37:20.735+00',true),
(69,'Primer_grado_medio','XALO','3','practicas','[Ejercicio] Configuración IPv6','2026-08-18 23:37:20.735+00',true),
(70,'Primer_grado_medio','XALO','3','practicas','[Ejercicio] Configuración de IPv6 con tres subredes','2026-08-18 23:37:20.735+00',true),
(71,'Primer_grado_medio','XALO','3','practicas','[Ejercicio 1] Routing tables','2026-08-18 23:37:20.735+00',true),
(72,'Primer_grado_medio','XALO','3','practicas','[Ejercicio 2] Static routing','2026-08-18 23:37:20.735+00',true),
(73,'Primer_grado_medio','XALO','3','practicas','[Ejercicio 3] static routing','2026-08-18 23:37:20.735+00',true),
(74,'Primer_grado_medio','XALO','3','practicas','[Ejercicio 1] VLAN','2026-08-18 23:37:20.735+00',true),
(75,'Primer_grado_medio','XALO','3','practicas','[Ejercicio 2] VLAN con varios switches','2026-08-18 23:37:20.735+00',true),
(76,'Primer_grado_medio','XALO','3','practicas','[Ejercicio] Introducción a Wireshark','2026-08-18 23:37:20.735+00',true),
(77,'Primer_grado_medio','XALO','3','practicas','[Ejercicio 3] Análisis de DNS UDP con wireshark','2026-08-18 23:37:20.735+00',true),
(78,'Primer_grado_medio','XALO','3','practicas','[Ejercicio 2] Wireshark TCP','2026-08-18 23:37:20.735+00',true)
ON CONFLICT (id) DO UPDATE SET
  rama=EXCLUDED.rama, asignatura=EXCLUDED.asignatura, trimestre=EXCLUDED.trimestre,
  seccion=EXCLUDED.seccion, nombre=EXCLUDED.nombre,
  visible=EXCLUDED.visible, actualizado_en=EXCLUDED.actualizado_en;

SELECT setval(
  pg_get_serial_sequence('"grados-informaticos".filas','id'),
  coalesce(max(id),1)
) FROM "grados-informaticos".filas;

-- ============================================================
-- 2. ARCHIVOS (sub-archivos con fila_id renumerado)
-- Referencia fila_id: 17=UD.2-VIRT(SOM) 23=UD5-CONV(MMDE)
--   33=UD2-FOL  36=CV-FOL-apuntes  43=Javascript(APOF)
--   44=1-INICI-apuntes(APOF)  45=2-Docs-apuntes(APOF)
--   46=1-INICI-practicas(APOF)
-- ============================================================
INSERT INTO "grados-informaticos".archivos
  (id, fila_id, nombre, actualizado_en, visible)
VALUES
-- SOM UD.2-VIRTUALIZACIÓN (fila_id=17)
(1,  17,'How_to_enable_virtualization_on_a_windows_10_computer_lenovo.mp4','2026-08-18 22:59:29.005+00',false),
(2,  17,'INSTALAR_Ubuntu_20.04_en_VirtualBox__2021_parte1.mp4','2026-08-18 22:59:30.687+00',false),
(3,  17,'INSTALAR_Ubuntu_20.04_en_VirtualBox__2021_parte2.mp4','2026-08-18 22:59:32.102+00',false),
(4,  17,'UD.2-VIRTUALBOX_Y_SLITAX_(MD5).part1.rar','2026-08-18 22:59:33.401+00',false),
(5,  17,'UD.2-VIRTUALBOX_Y_SLITAX_(MD5).part2.rar','2026-08-18 22:59:35.229+00',false),
(6,  17,'UD2.6-Algoritmos_de_planificacion-PRCTICA.pdf','2026-08-18 23:00:28.369+00',false),
(7,  17,'UD2.6-Algoritmos_de_planificacion-TEORA.pdf','2026-08-18 23:00:29.437+00',false),
-- MMDE UD5 CONVERSIONES (fila_id=23)
(8,  23,'02_Sistema_binario.pdf','2026-08-18 23:02:59.187+00',false),
(9,  23,'03_Hexadecimal.pdf','2026-08-18 23:03:29.96+00',true),
(10, 23,'02_Sistema_Octal.pdf','2026-08-18 23:03:19.108+00',true),
-- FOL UD2-MATERIAL PREVENCIÓN (fila_id=33)
(11, 33,'GRAU_MITJ.LA_PREVENCI_DE_RISCOS_LABORALS.pptx-2.pdf','2026-08-18 23:07:12.429+00',false),
-- FOL CV Y CARTA apuntes (fila_id=36)
(12, 36,'NATALIA_GMEZ_BAREA_VIDEOCURRICULUM_parte1.mp4','2026-08-18 23:15:43.778+00',false),
(13, 36,'NATALIA_GMEZ_BAREA_VIDEOCURRICULUM_parte2.mp4','2026-08-18 23:15:45.339+00',false),
(14, 36,'NATALIA_GMEZ_BAREA_CURRICULUM.pdf','2026-08-18 23:15:46.935+00',false),
-- APOF Javascript apuntes (fila_id=43)
(15, 43,'Javascript_1.pdf','2026-08-18 23:22:18.605+00',false),
(16, 43,'Javascript_2.pdf','2026-08-18 23:22:19.29+00',false),
-- APOF 1-INICI apuntes (fila_id=44)
(17, 44,'1-Ejercicios_inicio.pdf','2026-08-18 23:25:18.725+00',false),
-- APOF 2-Documents de Text apuntes (fila_id=45)
(18, 45,'1-Pautas_para_Informe_eficaz.docx.pdf','2026-08-18 23:24:17.005+00',false),
(19, 45,'2-Exercici_ESTILOS_-_Word.pdf','2026-08-18 23:24:19.213+00',false),
(20, 45,'NATALIA_GMEZ_BAREA__Y_GABRIEL_FERNNDEZ_TRAPERO__2-Traducci_col.laborativa_.pdf','2026-08-18 23:24:20.075+00',false),
-- APOF 1-INICI practicas (fila_id=46)
(21, 46,'1-Ejercicios_inicio.pdf','2026-08-18 23:24:51.221+00',false),
(22, 46,'4-Treball_dempresa_informtica.pdf','2026-08-18 23:24:58.259+00',true)
ON CONFLICT (id) DO UPDATE SET
  fila_id=EXCLUDED.fila_id, nombre=EXCLUDED.nombre,
  visible=EXCLUDED.visible, actualizado_en=EXCLUDED.actualizado_en;

SELECT setval(
  pg_get_serial_sequence('"grados-informaticos".archivos','id'),
  coalesce(max(id),1)
) FROM "grados-informaticos".archivos;
