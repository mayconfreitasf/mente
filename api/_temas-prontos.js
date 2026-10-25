// Categorias prontas dos temas sugeridos no campo "Com um tema" (dificuldade Fácil). Quem digita um desses temas
// recebe as perguntas na hora, sem gastar crédito de IA. Cada linha: enunciado | certa | errada | errada.
const tema = (titulo, peso, apelidos, subtemas, texto) => ({
  titulo, peso, apelidos, subtemas,
  perguntas: texto.trim().split("\n").map(l => l.split(" | ").map(x => x.trim())).filter(p => p.length === 4 && p.every(Boolean))
});

export const TEMAS_PRONTOS = [
  tema("Série Friends", 0.5, ["friends", "serie friends"], ["Personagens", "Episódios marcantes", "Bastidores e elenco"], `
Qual é a profissão de Ross Geller? | Paleontólogo | Arqueólogo | Geólogo
Em que área Monica Geller trabalha? | Chef de cozinha | Garçonete | Decoração
Qual é o nome da cafeteria onde o grupo se encontra? | Central Perk | Central Park | Coffee House
Qual instrumento Phoebe toca? | Violão | Piano | Ukulele
Qual é o sobrenome de Chandler? | Bing | Tribbiani | Green
Qual é a profissão de Joey? | Ator | Modelo | Chef
Em que área Rachel trabalha depois de sair da cafeteria? | Moda | Publicidade | Gastronomia
Qual é o nome da música famosa de Phoebe sobre um gato? | Smelly Cat | Stinky Cat | Silly Cat
Qual é o nome da irmã gêmea de Phoebe? | Ursula | Emily | Janice
Qual personagem tem o bordão "How you doin'?"? | Joey | Chandler | Ross
Qual namorada recorrente de Chandler é famosa pela risada? | Janice | Emily | Kathy
Qual animal de estimação Ross teve nas primeiras temporadas? | Um macaco | Um cachorro | Um gato
Qual é o nome do macaco de Ross? | Marcel | Max | Murphy
Com quem Monica se casa? | Chandler | Richard | Pete
Qual é o nome do filho de Ross com Carol? | Ben | Jack | Leo
Qual é o nome da filha de Ross e Rachel? | Emma | Ella | Erica
Qual é o sobrenome de Rachel? | Green | Geller | Buffay
Em que cidade a série se passa? | Nova York | Chicago | Los Angeles
Que frase Ross repete sobre a briga com Rachel? | "Nós estávamos dando um tempo!" | "Eu nunca menti!" | "Foi sem querer!"
Para onde Rachel ia se mudar no final da série? | Paris | Londres | Roma
Em que cidade acontece o casamento de Ross e Emily? | Londres | Paris | Las Vegas
Qual nome Ross fala errado no altar? | Rachel | Monica | Julie
Onde Ross e Rachel se casam bêbados? | Las Vegas | Atlantic City | Cancún
Qual móvel Ross tenta subir pela escada gritando "Pivot!"? | Um sofá | Uma mesa | Uma cama
O que Joey não divide, segundo ele mesmo? | Comida | Dinheiro | Roupas
Qual feriado Monica costuma organizar em casa? | Ação de Graças | Natal | Páscoa
O que Monica e Chandler adotam no final da série? | Gêmeos | Uma menina | Um cachorro
Quais são os nomes dos gêmeos adotados por Monica e Chandler? | Jack e Erica | Ben e Emma | Joey e Phoebe
Phoebe é barriga de aluguel dos trigêmeos de quem? | Do irmão dela, Frank Jr. | Da Monica | De uma amiga de escola
Qual personagem Joey interpreta na novela "Days of Our Lives"? | Dr. Drake Ramoray | Dr. Ross Geller | Dr. Mike Hannigan
Com quem Phoebe se casa? | Mike | David | Gary
Quais animais Chandler e Joey criam no apartamento? | Um pintinho e um pato | Dois gatos | Um macaco e um papagaio
De quem Rachel engravida? | Ross | Joey | Chandler
Qual é a profissão de Phoebe? | Massagista | Cabeleireira | Professora
Em que ano Friends estreou? | 1994 | 1990 | 1998
Quantas temporadas a série teve? | 10 | 8 | 12
Em que ano foi exibido o último episódio? | 2004 | 2002 | 2006
Quem interpretou Rachel? | Jennifer Aniston | Courteney Cox | Lisa Kudrow
Quem interpretou Chandler? | Matthew Perry | Matt LeBlanc | David Schwimmer
Quem interpretou Phoebe? | Lisa Kudrow | Jennifer Aniston | Courteney Cox
Quem interpretou Monica? | Courteney Cox | Lisa Kudrow | Jennifer Aniston
Quem interpretou Joey? | Matt LeBlanc | Matthew Perry | David Schwimmer
Quem interpretou Ross? | David Schwimmer | Matt LeBlanc | Matthew Perry
Qual banda gravou o tema "I'll Be There for You"? | The Rembrandts | Hootie & the Blowfish | Third Eye Blind
Qual canal americano exibia Friends? | NBC | CBS | ABC
Qual corte de cabelo virou moda por causa de Rachel? | "The Rachel" | "The Monica" | "The Friends"
Qual personagem ganhou uma série própria depois de Friends? | Joey | Chandler | Phoebe
Em que ano foi lançado o especial "Friends: The Reunion"? | 2021 | 2019 | 2023
Qual é a cor do sofá famoso do Central Perk? | Laranja | Vermelho | Verde
Qual ator interpretou Gunther, o atendente do Central Perk? | James Michael Tyler | Paul Rudd | Tom Selleck
Quem interpretou Mike, marido de Phoebe? | Paul Rudd | Bruce Willis | Tom Selleck
Quem interpretou Richard, o namorado mais velho de Monica? | Tom Selleck | Bruce Willis | Paul Rudd
Que personagem Brad Pitt interpretou num episódio de Ação de Graças? | Um ex-colega de escola de Rachel | Um irmão de Joey | Um chefe de Monica`),

  tema("Lei Maria da Penha", 0.8, ["maria da penha", "lei maria da penha", "lei 11340", "lei 11.340", "lei 11.340/2006"], ["Formas de violência", "Medidas protetivas", "Procedimentos e aplicação"], `
Qual é o número da Lei Maria da Penha? | Lei 11.340/2006 | Lei 8.069/1990 | Lei 13.104/2015
Em que ano a Lei Maria da Penha foi sancionada? | 2006 | 2002 | 2010
Quem foi Maria da Penha, que dá nome à lei? | Farmacêutica cearense vítima de violência doméstica | Juíza paulista | Deputada federal
Quantas formas de violência a lei lista expressamente? | Cinco | Três | Quatro
Reter documentos pessoais da mulher é qual tipo de violência? | Patrimonial | Moral | Física
Calúnia, difamação ou injúria contra a mulher configuram violência... | Moral | Psicológica | Patrimonial
Controlar, humilhar e isolar a mulher é violência... | Psicológica | Moral | Patrimonial
Impedir a mulher de usar método contraceptivo é violência... | Sexual | Física | Moral
A lei protege a mulher em relações do âmbito... | Doméstico, familiar ou de afeto | Apenas do casamento | Apenas do trabalho
A aplicação da lei depende da orientação sexual? | Não, independe da orientação sexual | Sim, só relações heterossexuais | Só para casais casados
A lei exige que o casal more junto para caracterizar relação íntima de afeto? | Não | Sim | Só após 2 anos de relação
Que órgão a lei criou para julgar esses casos? | Juizados de Violência Doméstica e Familiar contra a Mulher | Juizados Especiais Cíveis | Varas da Infância
A Lei 9.099/95, dos Juizados Especiais, se aplica a esses crimes? | Não | Sim | Só em lesão leve
É permitida pena de cesta básica nesses casos? | Não, é vedada | Sim | Só na primeira vez
Lesão corporal leve em violência doméstica gera ação penal... | Pública incondicionada | Privada | Pública condicionada à representação
Onde deve ocorrer a renúncia à representação, quando cabível? | Em audiência perante o juiz | Na delegacia | Por carta ao promotor
Em quanto tempo o juiz deve decidir sobre medidas protetivas após receber o pedido? | 48 horas | 24 horas | 5 dias
O afastamento do lar é uma medida que obriga... | O agressor | A vítima | O Ministério Público
Desde qual lei descumprir medida protetiva é crime? | Lei 13.641/2018 | Lei 11.340/2006 | Lei 14.188/2021
Medidas protetivas podem ser concedidas sem ouvir as partes antes? | Sim | Não | Só com advogado presente
A proibição de aproximação da ofendida é medida que obriga... | O agressor | A ofendida | O juiz
Encaminhar a mulher a programa de proteção é medida voltada... | À ofendida | Ao agressor | Ao delegado
Restringir visitas aos filhos menores é medida que obriga... | O agressor | A ofendida | O Conselho Tutelar
O juiz pode obrigar o agressor a frequentar programas de recuperação? | Sim | Não | Só se a vítima autorizar
Por quanto tempo valem as medidas protetivas? | Enquanto houver risco à mulher | 30 dias | Até o fim do inquérito
É preciso boletim de ocorrência para conceder medida protetiva? | Não necessariamente | Sim, sempre | Só com testemunha
Suspender a posse ou restringir o porte de armas é medida que obriga... | O agressor | A ofendida | O Ministério Público
O juiz pode fixar alimentos provisórios como medida protetiva? | Sim | Não | Só no divórcio
A prisão preventiva do agressor pode ser decretada... | Em qualquer fase do inquérito ou do processo | Só após a sentença | Nunca
Quem pode pedir medidas protetivas? | A ofendida ou o Ministério Público | Apenas o delegado | Apenas um advogado
Qual lei de 2015 incluiu o feminicídio como qualificadora do homicídio? | Lei 13.104/2015 | Lei 11.340/2006 | Lei 12.737/2012
A mulher deve estar acompanhada de advogado ou defensor nos atos do processo? | Sim | Não | Só no júri
A ofendida deve ser avisada quando o agressor sai da prisão? | Sim | Não | Só se pedir por escrito
A própria mulher pode entregar a intimação ao agressor? | Não | Sim | Só com testemunhas
No atendimento policial, a vítima tem direito a ser atendida preferencialmente por... | Servidoras do sexo feminino | Delegados homens | Juízes
Em quanto tempo o delegado deve enviar o pedido da ofendida ao juiz? | 48 horas | 24 horas | 10 dias
Segundo o STJ, a lei se aplica a mulheres trans? | Sim | Não | Só após cirurgia
Quem pode ser o agressor na Lei Maria da Penha? | Homem ou mulher | Apenas homem | Apenas o marido
Qual destes casos está no âmbito familiar da lei? | Filho que agride a mãe | Desconhecido na rua | Colega de academia
Qual número recebe denúncias de violência contra a mulher? | 180 | 190 | 193
Qual é o número de emergência da Polícia Militar? | 190 | 180 | 192
A lei prevê atendimento multidisciplinar com profissionais de... | Psicologia, assistência social e saúde | Engenharia | Arquitetura
A Lei Maria da Penha aumentou a pena de qual crime no Código Penal? | Lesão corporal em violência doméstica | Furto | Estelionato
Em que ano a Comissão Interamericana de Direitos Humanos responsabilizou o Brasil no caso Maria da Penha? | 2001 | 1995 | 2010
Quem foi o agressor de Maria da Penha? | O então marido | Um vizinho | Um desconhecido
Que sequela Maria da Penha teve após a tentativa de homicídio? | Paraplegia | Cegueira | Surdez
Qual destas condutas é violência patrimonial? | Destruir objetos de trabalho da mulher | Xingar a mulher | Empurrar a mulher
Forçar casamento ou gravidez mediante coação é violência... | Sexual | Moral | Patrimonial
Vigilância constante e perseguição são exemplos de violência... | Psicológica | Patrimonial | Física
Qual artigo do Código Penal tipifica a violência psicológica contra a mulher? | Art. 147-B | Art. 121 | Art. 155
Agredir fisicamente a mulher é qual forma de violência? | Física | Moral | Patrimonial
Expor a intimidade da mulher sem consentimento é violência... | Psicológica | Patrimonial | Física`),

  tema("Harry Potter", 0.5, ["harry potter"], ["Personagens", "Hogwarts e magia", "Livros e filmes"], `
Qual é a casa de Harry em Hogwarts? | Grifinória | Sonserina | Corvinal
Qual Weasley é o melhor amigo de Harry? | Rony | Fred | Percy
Qual é o nome da coruja de Harry? | Edwiges | Errol | Píchi
Quem é o diretor de Hogwarts na maior parte da saga? | Alvo Dumbledore | Severo Snape | Minerva McGonagall
Quem é o principal vilão da saga? | Lord Voldemort | Lúcio Malfoy | Belatriz Lestrange
Qual é o verdadeiro nome de Voldemort? | Tom Servolo Riddle | Tom Marvolo Gaunt | Tobias Snape
Qual elfo doméstico ajuda Harry e é libertado com uma meia? | Dobby | Monstro | Winky
Quem é o padrinho de Harry? | Sirius Black | Remo Lupin | Rúbeo Hagrid
Qual professor é um lobisomem? | Remo Lupin | Gilderoy Lockhart | Horácio Slughorn
Como se chamam os tios trouxas de Harry? | Válter e Petúnia Dursley | Artur e Molly Weasley | Lúcio e Narcisa Malfoy
Quem são os pais de Hermione? | Dentistas trouxas | Bruxos famosos | Professores de Hogwarts
Qual é a forma do patrono de Harry? | Um cervo | Uma lontra | Um cão
Qual é a forma do patrono de Hermione? | Uma lontra | Um gato | Uma coruja
Quem é o meio-gigante guarda-caça de Hogwarts? | Hagrid | Filch | Grope
Qual Malfoy estuda com Harry? | Draco | Lúcio | Escórpio
Quem matou Dumbledore? | Severo Snape | Draco Malfoy | Voldemort
Com qual irmã de Rony Harry se casa? | Gina | Luna | Fleur
Qual feitiço desarma o oponente? | Expelliarmus | Expecto Patronum | Lumos
Qual feitiço acende a ponta da varinha? | Lumos | Nox | Accio
Qual feitiço atrai objetos até o bruxo? | Accio | Lumos | Alohomora
Qual feitiço abre fechaduras? | Alohomora | Accio | Expelliarmus
Qual feitiço faz objetos flutuarem? | Wingardium Leviosa | Lumos | Imperio
Qual objeto escolhe a casa dos alunos? | Chapéu Seletor | Cálice de Fogo | Espelho de Ojesed
Qual esporte bruxo é jogado em vassouras? | Quadribol | Xadrez de bruxo | Snap Explosivo
Qual bola o apanhador precisa capturar? | Pomo de Ouro | Goles | Balaço
De qual plataforma sai o Expresso de Hogwarts? | 9¾ | 7½ | 10
Quais são as Maldições Imperdoáveis? | Avada Kedavra, Crucio e Imperio | Lumos, Nox e Accio | Expelliarmus, Stupefy e Protego
Como se chama a vila bruxa perto de Hogwarts? | Hogsmeade | Beco Diagonal | Godric's Hollow
Onde ficam as principais lojas bruxas de Londres? | Beco Diagonal | Hogsmeade | Godric's Hollow
Qual banco bruxo é administrado por duendes? | Gringotes | Azkaban | Borgin & Burkes
Qual é a prisão dos bruxos? | Azkaban | Gringotes | Hogsmeade
O que são Horcruxes? | Objetos que guardam pedaços da alma | Poções de amor | Varinhas antigas
Quantas Horcruxes Voldemort criou de propósito? | Seis | Sete | Três
Quais são as Relíquias da Morte? | Varinha das Varinhas, Pedra da Ressurreição e Capa da Invisibilidade | Chapéu Seletor, Espada e Taça | Diadema, Medalhão e Anel
O que é um trouxa? | Uma pessoa sem poderes mágicos | Um bruxo da Sonserina | Um elfo doméstico
Quais criaturas guardam Azkaban? | Dementadores | Hipogrifos | Testrálios
Qual poção dá sorte a quem bebe? | Felix Felicis | Polissuco | Amortentia
Qual poção permite assumir a aparência de outra pessoa? | Polissuco | Veritaserum | Felix Felicis
Quem escreveu a saga Harry Potter? | J.K. Rowling | Stephenie Meyer | J.R.R. Tolkien
Quantos livros principais tem a saga? | Sete | Oito | Seis
Qual é o primeiro livro da saga? | Harry Potter e a Pedra Filosofal | Harry Potter e a Câmara Secreta | Harry Potter e o Prisioneiro de Azkaban
Em que ano o primeiro livro foi publicado no Reino Unido? | 1997 | 2001 | 1993
Qual ator interpretou Harry nos filmes? | Daniel Radcliffe | Rupert Grint | Tom Felton
Quem interpretou Hermione nos filmes? | Emma Watson | Emma Stone | Bonnie Wright
Quem interpretou Rony nos filmes? | Rupert Grint | Daniel Radcliffe | Matthew Lewis
Quantos filmes tem a saga principal? | Oito | Sete | Dez
Qual livro foi dividido em dois filmes? | As Relíquias da Morte | O Enigma do Príncipe | A Ordem da Fênix
Quem interpretou Snape? | Alan Rickman | Gary Oldman | Ralph Fiennes
Quem interpretou Voldemort? | Ralph Fiennes | Alan Rickman | Michael Gambon
Em que ano estreou o primeiro filme? | 2001 | 1999 | 2004
Como se chama a peça de teatro que continua a história? | Harry Potter e a Criança Amaldiçoada | Harry Potter e o Herdeiro Perdido | Harry Potter e o Último Bruxo
Qual competição entre escolas acontece em "O Cálice de Fogo"? | Torneio Tribruxo | Taça das Casas | Torneio dos Duelos`),

  tema("Anatomia Humana", 0.8, ["anatomia", "anatomia humana"], ["Ossos e músculos", "Coração, sangue e respiração", "Sistema nervoso, digestório e outros"], `
Quantos ossos tem o esqueleto humano adulto, em média? | 206 | 186 | 256
Qual é o maior osso do corpo humano? | Fêmur | Tíbia | Úmero
Qual é o menor osso do corpo humano? | Estribo | Martelo | Bigorna
Onde fica o estribo? | Na orelha média | No pé | Na mão
Qual osso forma a testa? | Frontal | Occipital | Parietal
Qual osso liga o esterno à escápula? | Clavícula | Úmero | Rádio
Quantas vértebras cervicais o ser humano tem? | 7 | 5 | 12
Quantos pares de costelas o ser humano tem normalmente? | 12 | 10 | 14
Qual é o maior músculo do corpo humano? | Glúteo máximo | Quadríceps | Peitoral maior
Qual é o principal músculo da respiração? | Diafragma | Intercostal | Peitoral
Que estrutura liga o músculo ao osso? | Tendão | Ligamento | Cartilagem
Que estrutura liga um osso a outro osso? | Ligamento | Tendão | Fáscia
Qual é o principal movimento feito pelo bíceps braquial? | Flexão do cotovelo | Extensão do cotovelo | Rotação do ombro
Qual osso do antebraço fica do lado do polegar? | Rádio | Ulna | Úmero
Em qual articulação fica a patela? | Joelho | Cotovelo | Tornozelo
Que tipo de músculo forma o coração? | Estriado cardíaco | Liso | Estriado esquelético
Onde é produzida a maior parte das células do sangue no adulto? | Medula óssea vermelha | Fígado | Baço
Quantas câmaras tem o coração humano? | Quatro | Duas | Três
Qual vaso leva o sangue do coração para o corpo? | Aorta | Veia cava | Artéria pulmonar
Qual vaso leva o sangue do coração para os pulmões? | Artéria pulmonar | Aorta | Veia pulmonar
Por qual câmara o sangue vindo do corpo entra no coração? | Átrio direito | Átrio esquerdo | Ventrículo esquerdo
Qual câmara bombeia o sangue para todo o corpo? | Ventrículo esquerdo | Ventrículo direito | Átrio direito
Qual válvula fica entre o átrio esquerdo e o ventrículo esquerdo? | Mitral | Tricúspide | Pulmonar
Qual estrutura é o marca-passo natural do coração? | Nó sinoatrial | Nó atrioventricular | Feixe de His
Que vasos levam o sangue de volta ao coração? | Veias | Artérias | Arteríolas
Onde acontece a troca de gases nos pulmões? | Alvéolos | Brônquios | Traqueia
Qual estrutura impede a entrada de alimento na traqueia? | Epiglote | Laringe | Úvula
Quantos lobos tem o pulmão direito? | Três | Dois | Quatro
Quantos lobos tem o pulmão esquerdo? | Dois | Três | Um
Onde ficam as cordas vocais? | Laringe | Faringe | Traqueia
Qual célula do sangue transporta oxigênio? | Hemácia | Leucócito | Plaqueta
Qual proteína das hemácias se liga ao oxigênio? | Hemoglobina | Mioglobina | Albumina
Qual elemento do sangue atua na coagulação? | Plaqueta | Hemácia | Linfócito
Qual órgão é irrigado pelas artérias coronárias? | Coração | Cérebro | Pulmões
Qual é o maior órgão do corpo humano? | Pele | Fígado | Intestino
Qual é a maior glândula do corpo humano? | Fígado | Pâncreas | Tireoide
Onde a bile fica armazenada? | Vesícula biliar | Fígado | Pâncreas
Onde acontece a maior parte da absorção de nutrientes? | Intestino delgado | Estômago | Intestino grosso
Qual é a primeira parte do intestino delgado? | Duodeno | Jejuno | Íleo
Qual órgão produz a insulina? | Pâncreas | Fígado | Baço
Qual parte do encéfalo controla o equilíbrio e a coordenação? | Cerebelo | Bulbo | Hipotálamo
Qual parte do encéfalo controla a respiração e os batimentos cardíacos? | Bulbo | Cerebelo | Córtex frontal
Quantos pares de nervos cranianos existem? | 12 | 31 | 10
Quantos pares de nervos espinhais existem? | 31 | 12 | 24
Qual é a célula básica do sistema nervoso? | Neurônio | Néfron | Hepatócito
Qual é a unidade funcional do rim? | Néfron | Alvéolo | Neurônio
Qual glândula do pescoço regula o metabolismo? | Tireoide | Hipófise | Suprarrenal
Qual glândula é chamada de "glândula mestra"? | Hipófise | Tireoide | Pineal
Qual órgão filtra o sangue e produz a urina? | Rim | Bexiga | Fígado
Qual lobo do cérebro está ligado principalmente à visão? | Occipital | Frontal | Temporal
Em qual parte do intestino fica o apêndice? | Ceco | Duodeno | Reto
Quantos dentes tem a dentição permanente completa? | 32 | 28 | 20
Qual hormônio as suprarrenais liberam em situações de estresse? | Adrenalina | Insulina | Melatonina`),

  tema("Direito Penal", 1.2, ["direito penal"], ["Parte geral", "Crimes em espécie", "Penas"], `
Qual princípio diz que não há crime sem lei anterior que o defina? | Legalidade | Insignificância | Proporcionalidade
De que ano é o Código Penal brasileiro em vigor? | 1940 | 1988 | 2002
Segundo o Código Penal, quando se considera praticado o crime? | No momento da ação ou omissão | No momento do resultado | Quando o crime é descoberto
Qual teoria o Código Penal adota para o lugar do crime? | Ubiquidade | Atividade | Resultado
A partir de que idade a pessoa é penalmente imputável? | 18 anos | 16 anos | 21 anos
A legítima defesa exclui... | A ilicitude | A culpabilidade | A tipicidade
Além da legítima defesa, do estado de necessidade e do estrito cumprimento do dever legal, qual é outra excludente de ilicitude? | Exercício regular de direito | Coação moral irresistível | Embriaguez completa
Quando ocorre o crime tentado? | Quando, iniciada a execução, não se consuma por circunstâncias alheias à vontade do agente | Quando há apenas a cogitação | Quando o agente desiste por vontade própria
Em regra, de quanto é reduzida a pena da tentativa? | De um a dois terços | De metade | De um sexto a um terço
Quando o agente quis o resultado ou assumiu o risco de produzi-lo, o crime é... | Doloso | Culposo | Preterdoloso
Imprudência, negligência e imperícia caracterizam o crime... | Culposo | Doloso | Omissivo próprio
No arrependimento posterior, até quando o dano precisa ser reparado? | Até o recebimento da denúncia ou queixa | Até a sentença | Até o trânsito em julgado
A coação moral irresistível exclui... | A culpabilidade | A tipicidade | A ilicitude
Pelo conceito analítico mais aceito no Brasil, crime é fato... | Típico, ilícito e culpável | Apenas típico | Típico e punível
Na desistência voluntária, o agente responde... | Só pelos atos já praticados | Pela tentativa | Pelo crime consumado
O erro sobre elemento constitutivo do tipo exclui... | O dolo | A culpabilidade | A punibilidade
O princípio da insignificância afasta... | A tipicidade material | A culpabilidade | A ilicitude
Matar alguém é crime de... | Homicídio | Lesão corporal | Latrocínio
Subtrair coisa alheia móvel, sem violência ou grave ameaça, é... | Furto | Roubo | Estelionato
Subtrair coisa alheia móvel com violência ou grave ameaça é... | Roubo | Furto | Extorsão
Como é chamado o roubo seguido de morte? | Latrocínio | Homicídio qualificado | Extorsão mediante sequestro
Obter vantagem ilícita induzindo ou mantendo alguém em erro é... | Estelionato | Apropriação indébita | Receptação
Apropriar-se de coisa alheia móvel de que se tem a posse é... | Apropriação indébita | Furto | Receptação
Adquirir coisa que sabe ser produto de crime é... | Receptação | Favorecimento pessoal | Furto
Imputar falsamente a alguém fato definido como crime é... | Calúnia | Difamação | Injúria
Ofender a dignidade ou o decoro de alguém é... | Injúria | Calúnia | Difamação
Imputar a alguém fato ofensivo à reputação, que não é crime, é... | Difamação | Calúnia | Injúria
O funcionário público que se apropria de bem que tem em razão do cargo comete... | Peculato | Concussão | Prevaricação
Exigir vantagem indevida em razão da função pública é... | Concussão | Corrupção passiva | Peculato
Solicitar ou receber vantagem indevida em razão da função é... | Corrupção passiva | Concussão | Corrupção ativa
Oferecer vantagem indevida a funcionário público para que pratique ato de ofício é... | Corrupção ativa | Corrupção passiva | Tráfico de influência
Retardar ato de ofício para satisfazer interesse pessoal é... | Prevaricação | Peculato | Condescendência criminosa
Matar o próprio filho, durante ou logo após o parto, sob influência do estado puerperal, é... | Infanticídio | Homicídio | Aborto
Como se chama o homicídio contra a mulher por razões da condição de sexo feminino? | Feminicídio | Infanticídio | Homicídio culposo
Quais são as espécies de pena no Código Penal? | Privativas de liberdade, restritivas de direitos e multa | Prisão, morte e multa | Reclusão e banimento
Qual é hoje o tempo máximo de cumprimento de pena privativa de liberdade? | 40 anos | 30 anos | 50 anos
Onde é cumprido o regime fechado? | Em estabelecimento de segurança máxima ou média | Em colônia agrícola | Em casa de albergado
Onde é cumprido o regime semiaberto? | Em colônia agrícola, industrial ou similar | Em casa de albergado | Em penitenciária de segurança máxima
Onde é cumprido o regime aberto? | Em casa de albergado ou estabelecimento adequado | Em colônia agrícola | Em presídio federal
Em regra, até quanto de pena cabe a substituição por restritiva de direitos, sem violência ou grave ameaça? | 4 anos | 8 anos | 2 anos
A prestação de serviços à comunidade é pena... | Restritiva de direitos | Privativa de liberdade | De multa
A reincidência ocorre quando o novo crime é cometido depois de... | Sentença condenatória transitada em julgado | Ser indiciado | Ser denunciado
Quanto tempo após o cumprimento da pena a condenação deixa de gerar reincidência? | 5 anos | 2 anos | 10 anos
A prescrição é causa de... | Extinção da punibilidade | Exclusão da ilicitude | Exclusão da culpabilidade
A morte do agente gera... | Extinção da punibilidade | Exclusão da tipicidade | Redução da pena
Quantas fases tem o cálculo da pena (dosimetria)? | Três | Duas | Quatro
O que o juiz analisa na primeira fase da dosimetria? | As circunstâncias judiciais do art. 59 | Agravantes e atenuantes | Causas de aumento e diminuição
A confissão espontânea é... | Atenuante | Agravante | Causa de aumento
A reincidência é... | Agravante | Atenuante | Qualificadora
Em regra, a suspensão condicional da pena (sursis) cabe para penas de até... | 2 anos | 4 anos | 8 anos
No livramento condicional, o condenado não reincidente em crime doloso e com bons antecedentes precisa cumprir mais de... | Um terço da pena | Metade da pena | Dois terços da pena
Em que unidade a pena de multa é calculada? | Dias-multa | Salários mínimos fixos | Unidades fiscais`),

  tema("Os Beatles", 0.5, ["beatles", "os beatles", "the beatles"], ["Integrantes", "Discos e músicas", "História da banda"], `
De qual cidade inglesa vieram os Beatles? | Liverpool | Londres | Manchester
Quais eram os quatro integrantes mais famosos? | John, Paul, George e Ringo | John, Paul, Mick e Ringo | John, Pete, George e Keith
Quem era o baterista na fase de maior sucesso? | Ringo Starr | Pete Best | Charlie Watts
Qual instrumento Paul McCartney tocava principalmente? | Baixo | Bateria | Teclado
Qual Beatle compôs "Something"? | George Harrison | John Lennon | Paul McCartney
Qual era a principal dupla de compositores da banda? | Lennon e McCartney | Harrison e Starr | Jagger e Richards
Qual é o nome verdadeiro de Ringo Starr? | Richard Starkey | Ronald Starr | Robert Stark
Quem foi o empresário dos Beatles até 1967? | Brian Epstein | George Martin | Allen Klein
Quem foi o produtor musical da banda? | George Martin | Brian Epstein | Allen Klein
Qual baterista foi substituído por Ringo em 1962? | Pete Best | Stuart Sutcliffe | Jimmy Nicol
Qual Beatle foi assassinado em 1980? | John Lennon | George Harrison | Paul McCartney
Com quem John Lennon se casou em 1969? | Yoko Ono | Linda Eastman | Pattie Boyd
Qual banda Paul McCartney formou depois dos Beatles? | Wings | Plastic Ono Band | Traveling Wilburys
De qual banda George Harrison fez parte com Bob Dylan nos anos 80? | Traveling Wilburys | Wings | Cream
Qual Beatle mais se dedicou à música indiana e à cítara? | George Harrison | Ringo Starr | Paul McCartney
Quem era o Beatle mais novo? | George Harrison | Paul McCartney | John Lennon
Qual Beatle canta "Yellow Submarine"? | Ringo Starr | John Lennon | George Harrison
Qual álbum tem a famosa capa na faixa de pedestres? | Abbey Road | Let It Be | Revolver
Qual álbum de 1967 é considerado um marco conceitual? | Sgt. Pepper's Lonely Hearts Club Band | Help! | Rubber Soul
Qual foi o primeiro single da banda, em 1962? | Love Me Do | Please Please Me | She Loves You
Qual é o título oficial do "Álbum Branco"? | The Beatles | White | Beatles '68
Qual música começa com "Yesterday, all my troubles seemed so far away"? | Yesterday | Let It Be | Help!
Qual canção tem o refrão "All you need is love"? | All You Need Is Love | Love Me Do | And I Love Her
Para quem Paul escreveu "Hey Jude"? | Julian, filho de John | A filha Mary | Linda McCartney
Qual música de George Harrison tem o verso "Here comes the sun"? | Here Comes the Sun | Something | Taxman
Qual filme dos Beatles de 1964 leva o nome de uma música? | A Hard Day's Night | Help! | Magical Mystery Tour
Qual foi o último álbum lançado pela banda? | Let It Be | Abbey Road | Yellow Submarine
Qual foi o último álbum gravado pela banda? | Abbey Road | Let It Be | Revolver
Qual música dos Beatles é uma das mais regravadas da história? | Yesterday | Twist and Shout | Penny Lane
"Penny Lane" e "Strawberry Fields Forever" falam de lugares de qual cidade? | Liverpool | Londres | Hamburgo
Qual animação de 1968 tem os Beatles como personagens? | Yellow Submarine | Help! | Let It Be
Em qual álbum de 1966 está "Eleanor Rigby"? | Revolver | Rubber Soul | Help!
Em qual álbum de 1965 está "Norwegian Wood"? | Rubber Soul | Revolver | Beatles for Sale
Qual música de 1963 ficou famosa pelo "yeah, yeah, yeah"? | She Loves You | Love Me Do | Help!
Em qual cidade alemã os Beatles tocaram no começo da carreira? | Hamburgo | Berlim | Munique
Em qual clube de Liverpool a banda se apresentava? | The Cavern Club | The Marquee | The Roxy
Em que ano os Beatles se apresentaram no Ed Sullivan Show, nos EUA? | 1964 | 1962 | 1966
Como ficou conhecido o fenômeno das fãs histéricas? | Beatlemania | Liverpoolmania | Rockmania
Como ficou conhecido o sucesso das bandas inglesas nos EUA nos anos 60? | Invasão Britânica | Onda Inglesa | Era Mersey
Em que ano a banda se separou oficialmente? | 1970 | 1968 | 1974
Onde foi a última apresentação ao vivo dos Beatles, em 1969? | No telhado da Apple Corps | No Shea Stadium | No Cavern Club
Qual estádio americano recebeu um show histórico dos Beatles em 1965? | Shea Stadium | Wembley | Maracanã
Qual gravadora os Beatles fundaram? | Apple Records | Island Records | Virgin Records
Para qual país os Beatles viajaram em 1968 para estudar meditação? | Índia | Japão | Nepal
Qual era o gênero musical da banda no início? | Rock and roll | Jazz | Música clássica
Qual frase de Lennon, em 1966, causou boicotes nos EUA? | Que eram "mais populares que Jesus" | Que odiavam os EUA | Que iam parar de tocar
Em que ano George Harrison morreu? | 2001 | 1995 | 2008
Qual estúdio de Londres ficou famoso pelas gravações da banda? | Abbey Road Studios | Olympic Studios | Trident Studios
Qual "nova" música dos Beatles foi lançada em 2023 com ajuda de tecnologia? | Now and Then | Free as a Bird | Real Love
Qual baixista saiu da banda em 1961? | Stuart Sutcliffe | Pete Best | Billy Preston
Qual tecladista tocou com a banda em "Get Back"? | Billy Preston | Elton John | Eric Clapton
Qual era o nome da banda antes de se chamar Beatles? | The Quarrymen | The Rockets | The Mersey Boys`),

  tema("Contabilidade Básica", 1.5, ["contabilidade", "contabilidade basica"], ["Patrimônio e princípios", "Balanço e demonstrações", "Lançamentos contábeis"], `
Qual é o objeto de estudo da Contabilidade? | O patrimônio | Apenas o lucro | Apenas os impostos
O patrimônio é o conjunto de... | Bens, direitos e obrigações | Apenas bens | Apenas dinheiro
Bens e direitos formam o... | Ativo | Passivo | Patrimônio líquido
As obrigações com terceiros formam o... | Passivo | Ativo | Receita
Qual é a equação fundamental do patrimônio? | Ativo = Passivo + Patrimônio Líquido | Ativo = Receita − Despesa | Passivo = Ativo + Patrimônio Líquido
Se o ativo é R$ 100 mil e o passivo é R$ 60 mil, qual é o patrimônio líquido? | R$ 40 mil | R$ 160 mil | R$ 60 mil
Quando o passivo é maior que o ativo, a situação é de... | Passivo a descoberto | Superávit | Equilíbrio
Um imóvel da empresa é classificado como... | Bem | Direito | Obrigação
Duplicatas a receber são... | Direitos | Bens | Obrigações
Salários a pagar são... | Obrigações | Direitos | Bens
Onde fica o capital social investido pelos sócios? | No patrimônio líquido | No passivo circulante | No ativo
Qual princípio manda registrar receitas e despesas quando ocorrem, e não quando são pagas? | Competência | Caixa | Prudência
Qual princípio separa o patrimônio da empresa do patrimônio dos sócios? | Entidade | Continuidade | Competência
Qual princípio presume que a empresa vai continuar operando? | Continuidade | Entidade | Oportunidade
Qual regime considera as receitas e despesas no momento do recebimento ou pagamento? | Regime de caixa | Regime de competência | Regime de prudência
O ativo circulante reúne bens e direitos realizáveis em até... | 12 meses | 24 meses | 5 anos
Máquinas usadas na produção ficam no... | Ativo imobilizado | Ativo circulante | Passivo
Qual demonstração mostra a posição patrimonial em uma data? | Balanço Patrimonial | DRE | DFC
Qual demonstração mostra o lucro ou prejuízo do período? | DRE | Balanço Patrimonial | DMPL
Qual demonstração mostra as entradas e saídas de caixa? | DFC | DRE | DVA
A DFC divide o caixa em atividades operacionais, de investimento e... | De financiamento | De vendas | Tributárias
Receita bruta menos as deduções resulta em... | Receita líquida | Lucro bruto | Lucro líquido
Receita líquida menos o custo das mercadorias vendidas resulta em... | Lucro bruto | Lucro líquido | Receita bruta
No balanço, como o ativo é ordenado? | Por grau de liquidez decrescente | Por valor | Em ordem alfabética
No balanço, como o passivo é ordenado? | Por prazo de exigibilidade | Por valor | Por liquidez crescente
Qual demonstração mostra a riqueza gerada e como ela foi distribuída? | DVA | DRE | DFC
Um empréstimo a pagar em 3 anos é... | Passivo não circulante | Passivo circulante | Ativo não circulante
Onde ficam os estoques? | No ativo circulante | No ativo imobilizado | No patrimônio líquido
Onde ficam as reservas de lucros? | No patrimônio líquido | No passivo | No ativo
O que a depreciação representa? | A perda de valor dos bens do imobilizado pelo uso ou tempo | O aumento do valor de imóveis | O pagamento de impostos
A amortização se aplica principalmente a... | Ativos intangíveis | Estoques | Caixa
A exaustão se aplica a... | Recursos naturais | Máquinas | Marcas
Onde ficam marcas e patentes? | No intangível | No imobilizado | No circulante
Em regra, quanto dura o exercício social? | 12 meses | 6 meses | 24 meses
No método das partidas dobradas, cada débito corresponde a... | Um crédito de mesmo valor | Dois créditos | Nenhum crédito
As contas do ativo aumentam por... | Débito | Crédito | Estorno
As contas do passivo aumentam por... | Crédito | Débito | Ajuste
As contas de despesa aumentam por... | Débito | Crédito | Provisão
As contas de receita aumentam por... | Crédito | Débito | Depreciação
Na compra de mercadoria à vista, debita-se Estoque e credita-se... | Caixa | Fornecedores | Capital social
Na compra de mercadoria a prazo, credita-se... | Fornecedores | Caixa | Clientes
Na venda a prazo, debita-se... | Clientes | Caixa | Fornecedores
No pagamento a fornecedor, debita-se Fornecedores e credita-se... | Caixa ou Bancos | Receita | Estoque
Na integralização de capital em dinheiro, debita-se Caixa e credita-se... | Capital social | Receita | Fornecedores
Qual livro registra os lançamentos em ordem cronológica? | Diário | Razão | Inventário
Qual livro agrupa os lançamentos por conta? | Razão | Diário | Inventário
Como se chama o gráfico em forma de T usado para representar contas? | Razonete | Balancete | Fichário
Para que serve o balancete de verificação? | Para conferir se os débitos somam o mesmo que os créditos | Para calcular impostos | Para pagar fornecedores
Como é registrado o pagamento antecipado de um seguro? | Como despesa antecipada, no ativo | Como despesa do período | Como passivo
O que gera o recebimento adiantado de um cliente? | Um passivo (adiantamento de clientes) | Uma receita imediata | Um ativo intangível
Para que serve o estorno? | Para corrigir um lançamento errado | Para registrar vendas | Para calcular o lucro
O que indica o saldo devedor da conta Caixa? | Dinheiro disponível | Uma dívida | Um prejuízo`),

  tema("Star Wars", 0.8, ["star wars", "guerra nas estrelas"], ["Personagens", "Filmes e elenco", "Universo e curiosidades"], `
Quem é o pai de Luke Skywalker? | Darth Vader | Obi-Wan Kenobi | Imperador Palpatine
Qual é a frase de Vader na grande revelação de "O Império Contra-Ataca"? | "Não, eu sou seu pai." | "Eu sou seu mestre." | "Junte-se ao lado sombrio."
Quem é a irmã gêmea de Luke? | Leia | Padmé | Rey
Quem é o capitão da Millennium Falcon na trilogia original? | Han Solo | Poe Dameron | Wedge Antilles
De qual espécie é Chewbacca? | Wookiee | Ewok | Gungan
Qual droide é fluente em milhões de formas de comunicação? | C-3PO | R2-D2 | BB-8
Quem treinou Luke no planeta Dagobah? | Yoda | Obi-Wan Kenobi | Qui-Gon Jinn
Qual mestre Jedi encontrou Anakin em Tatooine? | Qui-Gon Jinn | Mace Windu | Yoda
Qual é o nome do Imperador? | Palpatine | Darth Maul | Conde Dookan
Quem é a mãe de Luke e Leia? | Padmé Amidala | Shmi Skywalker | Mon Mothma
Qual vilão da nova trilogia é filho de Han e Leia? | Kylo Ren | General Hux | Snoke
Qual é o nome verdadeiro de Kylo Ren? | Ben Solo | Ben Kenobi | Jacen Solo
Qual caçador de recompensas leva Han congelado até Jabba? | Boba Fett | Greedo | Bossk
Quem é o protagonista da série "The Mandalorian"? | Din Djarin | Boba Fett | Cassian Andor
Como Grogu ficou conhecido pelos fãs? | "Baby Yoda" | "Mini Jedi" | "Yodinha"
Quem é a protagonista da trilogia final? | Rey | Jyn Erso | Ahsoka Tano
Quem é a aprendiz de Anakin nas animações? | Ahsoka Tano | Rey | Asajj Ventress
Em que ano estreou o primeiro filme, "Uma Nova Esperança"? | 1977 | 1980 | 1983
Quem criou Star Wars? | George Lucas | Steven Spielberg | J.J. Abrams
Qual empresa comprou a Lucasfilm em 2012? | Disney | Warner | Sony
Qual é o Episódio V? | O Império Contra-Ataca | O Retorno de Jedi | A Ameaça Fantasma
Qual é o Episódio I? | A Ameaça Fantasma | Ataque dos Clones | A Vingança dos Sith
Em qual filme Anakin se torna Darth Vader? | A Vingança dos Sith | Ataque dos Clones | Uma Nova Esperança
Qual filme mostra o roubo dos planos da Estrela da Morte? | Rogue One | Solo | O Despertar da Força
Quem compôs a trilha sonora clássica? | John Williams | Hans Zimmer | Ennio Morricone
Quem interpretou Luke na trilogia original? | Mark Hamill | Harrison Ford | Ewan McGregor
Quem interpretou Han Solo na trilogia original? | Harrison Ford | Mark Hamill | Billy Dee Williams
Quem interpretou Leia na trilogia original? | Carrie Fisher | Natalie Portman | Daisy Ridley
Quem deu voz a Darth Vader nos filmes originais? | James Earl Jones | David Prowse | Morgan Freeman
Qual é o Episódio VII? | O Despertar da Força | Os Últimos Jedi | A Ascensão Skywalker
Quantos filmes formam a saga Skywalker principal? | Nove | Seis | Doze
Qual planeta é destruído pela Estrela da Morte no primeiro filme? | Alderaan | Tatooine | Hoth
Em qual planeta desértico Luke cresceu? | Tatooine | Jakku | Naboo
Em qual planeta gelado fica a base rebelde de "O Império Contra-Ataca"? | Hoth | Endor | Kamino
Qual é a arma típica dos Jedi? | Sabre de luz | Blaster | Bastão elétrico
Qual cor costuma ter o sabre de luz dos Sith? | Vermelho | Azul | Verde
Qual energia dá poder aos Jedi? | A Força | O Espírito | A Luz
Segundo a "Regra de Dois", quantos Sith existem por vez? | Dois: um mestre e um aprendiz | Um só | Doze
Que criaturinhas vivem na lua florestal de Endor? | Ewoks | Jawas | Porgs
O que é a Millennium Falcon? | Um cargueiro modificado | Um caça TIE | Um destróier estelar
Qual caça é usado pelos rebeldes? | X-wing | TIE Fighter | Destróier estelar
Qual caça pertence ao Império? | TIE Fighter | X-wing | A-wing
Como se chamam os soldados de armadura branca do Império? | Stormtroopers | Jawas | Ewoks
Qual mestre Jedi usa sabre de luz roxo? | Mace Windu | Yoda | Obi-Wan Kenobi
Em que dia os fãs celebram Star Wars? | 4 de maio | 25 de maio | 1º de abril
O que significa a frase "Que a Força esteja com você"? | Um desejo de boa sorte | Uma ameaça | Um juramento Sith
Qual é a espécie de Yoda? | Nunca foi revelada | Wookiee | Gungan
Qual Gungan atrapalhado aparece no Episódio I? | Jar Jar Binks | Watto | Sebulba
O que é a Estrela da Morte? | Uma estação espacial capaz de destruir planetas | Um planeta Sith | Uma nave rebelde
Quem diz "Faça ou não faça. Tentativa não há."? | Yoda | Obi-Wan Kenobi | Luke Skywalker
O que Obi-Wan conta a Luke sobre o pai dele no primeiro filme? | Que Vader traiu e matou seu pai | Que o pai estava vivo em Tatooine | Que o pai era um Sith desde criança
Qual vilão de rosto vermelho e preto luta com Qui-Gon e Obi-Wan no Episódio I? | Darth Maul | Darth Vader | General Grievous`),

  tema("Farmacologia Básica", 1.5, ["farmacologia", "farmacologia basica"], ["Farmacocinética", "Farmacodinâmica e classes", "Uso seguro e antídotos"], `
O que a farmacocinética estuda? | O que o organismo faz com o fármaco | O que o fármaco faz no organismo | A fabricação de remédios
O que a farmacodinâmica estuda? | O que o fármaco faz no organismo | O que o organismo faz com o fármaco | O preço dos remédios
Quais são as etapas da farmacocinética? | Absorção, distribuição, metabolização e excreção | Síntese, embalagem e venda | Prescrição, compra e uso
Qual órgão é o principal responsável pelo metabolismo dos fármacos? | Fígado | Rim | Pulmão
Qual órgão é o principal responsável pela excreção dos fármacos? | Rim | Fígado | Pele
O que é a meia-vida de um fármaco? | O tempo para a concentração no plasma cair pela metade | O prazo de validade | Metade da dose diária
O que é biodisponibilidade? | A fração do fármaco que chega à circulação sistêmica | O prazo de validade | A dose máxima
Qual via de administração tem biodisponibilidade de 100%? | Intravenosa | Oral | Retal
O efeito de primeira passagem ocorre principalmente com a via... | Oral | Intravenosa | Inalatória
Que família de enzimas do fígado metaboliza muitos fármacos? | Citocromo P450 | Amilases | Lipases
O que é um pró-fármaco? | Uma substância inativa que se torna ativa no organismo | Um remédio vencido | Um placebo
O que significa um índice terapêutico estreito? | Pequena margem entre a dose eficaz e a tóxica | Remédio fraco | Poucos efeitos colaterais
Qual é a vantagem da via sublingual? | Absorção rápida, sem a primeira passagem pelo fígado | Sabor agradável | Liberação lenta
A ligação a proteínas do plasma, como a albumina, afeta principalmente... | A distribuição | A cor do comprimido | A embalagem
Um fármaco com meia-vida de 6 horas terá, após 12 horas, cerca de... | 25% da concentração inicial | 50% da concentração inicial | Nada no sangue
Para que serve a dose de ataque? | Para atingir rápido a concentração desejada | Para reduzir efeitos colaterais | Para testar alergia
O que indica o clearance (depuração)? | O volume de plasma livre do fármaco por unidade de tempo | O tempo de absorção | A dose diária
O que faz um fármaco agonista? | Ativa o receptor | Bloqueia o receptor | Destrói o receptor
O que faz um fármaco antagonista? | Bloqueia o receptor sem ativá-lo | Ativa o receptor | Aumenta a dose
A potência de um fármaco se refere a... | Quantidade necessária para produzir o efeito | Efeito máximo possível | Duração do efeito
A eficácia de um fármaco se refere a... | Efeito máximo que ele pode produzir | Dose necessária | Preço
O paracetamol é classificado como... | Analgésico e antitérmico | Antibiótico | Antidepressivo
A qual classe pertence o ibuprofeno? | Anti-inflamatório não esteroidal | Corticoide | Opioide
A amoxicilina é... | Um antibiótico betalactâmico | Um antiviral | Um antifúngico
Como o omeprazol atua? | Inibindo a bomba de prótons | Neutralizando o ácido com cálcio | Matando bactérias
A losartana é usada principalmente para tratar... | Hipertensão | Diabetes | Asma
A metformina é usada no tratamento de... | Diabetes tipo 2 | Hipertensão | Epilepsia
O salbutamol é usado em crises de... | Asma | Enxaqueca | Gastrite
A morfina pertence à classe dos... | Opioides | Benzodiazepínicos | Anti-inflamatórios
O diazepam pertence à classe dos... | Benzodiazepínicos | Opioides | Antipsicóticos
A fluoxetina é um... | Antidepressivo inibidor seletivo da recaptação de serotonina | Ansiolítico benzodiazepínico | Antipsicótico
A varfarina é um... | Anticoagulante | Diurético | Antibiótico
A furosemida é um... | Diurético de alça | Betabloqueador | Antibiótico
O propranolol é um... | Betabloqueador | Bloqueador dos canais de cálcio | Diurético
Antibióticos agem contra... | Bactérias | Vírus | Qualquer micróbio
Qual é o antídoto da intoxicação por opioides? | Naloxona | Flumazenil | Atropina
Qual é o antídoto da intoxicação por benzodiazepínicos? | Flumazenil | Naloxona | N-acetilcisteína
Qual é o antídoto da intoxicação por paracetamol? | N-acetilcisteína | Naloxona | Vitamina K
Qual substância reverte o efeito da varfarina? | Vitamina K | Protamina | Flumazenil
Qual substância reverte o efeito da heparina? | Protamina | Vitamina K | Naloxona
O uso prolongado de anti-inflamatórios não esteroidais aumenta o risco de... | Úlcera gástrica | Queda de cabelo | Miopia
O que pode acontecer ao misturar álcool e benzodiazepínicos? | Sedação intensa e depressão respiratória | Euforia leve sem risco | Nada
Por que o suco de toranja (grapefruit) interfere em alguns fármacos? | Porque inibe a enzima CYP3A4 | Porque contém insulina | Porque bloqueia os rins
O uso de antibióticos sem necessidade favorece... | A resistência bacteriana | A imunidade permanente | A cura de viroses
O que é um efeito adverso? | Um efeito indesejado do medicamento | O efeito esperado | A dose ideal
O que tem o medicamento genérico em relação ao de referência? | O mesmo princípio ativo e a mesma eficácia | Princípio ativo diferente | Sempre dose menor
Em uma receita, o que significa "VO"? | Via oral | Vez ou outra | Volume ótimo
O que é tolerância a um fármaco? | Precisar de doses maiores para o mesmo efeito | Ter alergia ao remédio | Estar curado
Qual órgão registra medicamentos no Brasil? | Anvisa | Ministério da Educação | Inmetro
O que exigem os medicamentos de tarja preta? | Receita especial retida na farmácia | Nenhuma receita | Apenas receita comum
Qual classe as gestantes devem evitar pelo risco de malformação? | Inibidores da ECA, como o enalapril | Ácido fólico | Paracetamol em dose usual
Como se chama a interação em que um fármaco aumenta o efeito de outro? | Sinergismo | Antagonismo | Tolerância`),

  tema("Futebol", 0.5, ["futebol"], ["Copas do Mundo", "Clubes e jogadores", "Regras e curiosidades"], `
Quantas Copas do Mundo o Brasil já venceu? | 5 | 4 | 6
Em que ano o Brasil ganhou sua primeira Copa do Mundo? | 1958 | 1962 | 1970
Qual país sediou a Copa do Mundo de 2014? | Brasil | Rússia | Alemanha
Qual seleção venceu a Copa de 2022? | Argentina | França | Brasil
Em qual país foi disputada a Copa de 2022? | Catar | Rússia | Estados Unidos
Qual foi o placar de Alemanha x Brasil na semifinal de 2014? | 7 a 1 | 5 a 0 | 3 a 1
Qual seleção venceu a primeira Copa, em 1930? | Uruguai | Argentina | Itália
Além do Brasil, quais seleções têm quatro títulos mundiais? | Alemanha e Itália | Argentina e França | Uruguai e Espanha
Em que ano aconteceu o "Maracanaço"? | 1950 | 1958 | 1966
Quem foi o artilheiro do Brasil na Copa de 2002? | Ronaldo | Rivaldo | Romário
Quem é o maior artilheiro da história das Copas? | Miroslav Klose | Ronaldo | Pelé
Quais países sediam a Copa de 2026? | Estados Unidos, Canadá e México | Brasil e Argentina | Espanha e Portugal
Quantas seleções disputam a Copa de 2026? | 48 | 32 | 40
Quem era o técnico do Brasil no pentacampeonato? | Luiz Felipe Scolari | Tite | Carlos Alberto Parreira
Quem marcou o gol do título da Espanha em 2010? | Iniesta | Xavi | Fernando Torres
Qual seleção venceu a Copa de 2018? | França | Croácia | Alemanha
Como se chamava a primeira taça da Copa, conquistada em definitivo pelo Brasil em 1970? | Jules Rimet | Taça FIFA | Taça Libertadores
Qual jogador é chamado de "Rei do Futebol"? | Pelé | Maradona | Zico
Em qual clube Pelé fez a maior parte da carreira? | Santos | Flamengo | Palmeiras
Qual jogador foi o capitão da Argentina no título de 2022? | Lionel Messi | Di María | Maradona
Qual jogador português é famoso pela comemoração "Siu"? | Cristiano Ronaldo | Luís Figo | Bernardo Silva
Qual clube espanhol é chamado de "Merengue"? | Real Madrid | Barcelona | Atlético de Madrid
Qual torneio decide o campeão de clubes da América do Sul? | Copa Libertadores | Copa Sul-Americana | Liga dos Campeões
Qual é o principal torneio europeu de clubes? | Liga dos Campeões | Liga Europa | Copa do Rei
Qual brasileiro foi eleito o melhor do mundo pela FIFA em 2007? | Kaká | Ronaldinho | Neymar
Qual jogador brasileiro é conhecido como "Fenômeno"? | Ronaldo | Romário | Adriano
Qual clube revelou Neymar? | Santos | São Paulo | Grêmio
Qual jogador é o "Baixinho", campeão do mundo em 1994? | Romário | Bebeto | Dunga
Quem levantou a taça como capitão do Brasil em 2002? | Cafu | Roberto Carlos | Ronaldo
Qual estádio do Rio de Janeiro é chamado de "Templo do Futebol"? | Maracanã | Mineirão | Morumbi
Qual clube paulista é chamado de "Timão"? | Corinthians | Palmeiras | Santos
Qual clube carioca é chamado de "Tricolor das Laranjeiras"? | Fluminense | Flamengo | Botafogo
Contra qual seleção Maradona marcou o gol de "la mano de Dios"? | Inglaterra | Alemanha | Brasil
Qual prêmio da revista France Football é dado ao melhor jogador do ano? | Bola de Ouro | Chuteira de Ouro | Luva de Ouro
Quantos jogadores cada time tem em campo? | 11 | 10 | 12
Quanto dura uma partida oficial, sem os acréscimos? | 90 minutos | 80 minutos | 100 minutos
Qual cartão expulsa o jogador? | Vermelho | Amarelo | Azul
Quantos cartões amarelos na mesma partida levam à expulsão? | Dois | Três | Um
De quantos metros é cobrado o pênalti? | 11 metros | 9 metros | 16 metros
O que significa a sigla VAR? | Árbitro Assistente de Vídeo | Variação de Arbitragem | Verificação Automática de Regras
Qual jogador pode tocar a bola com as mãos dentro da própria área? | Goleiro | Capitão | Zagueiro
Como se chama a infração do atacante à frente da defesa no momento do passe? | Impedimento | Falta | Lateral
Quantas substituições são permitidas em jogos oficiais hoje, em regra? | 5 | 3 | 7
O que é um gol olímpico? | Um gol marcado direto do escanteio | Um gol do meio-campo | Um gol de bicicleta
Quanto dura cada tempo da prorrogação? | 15 minutos | 10 minutos | 20 minutos
Em qual país o futebol moderno ganhou suas regras? | Inglaterra | Brasil | Itália
Qual entidade comanda o futebol mundial? | FIFA | UEFA | CBF
Qual entidade comanda o futebol brasileiro? | CBF | FIFA | Conmebol
Quando a bola sai pela linha lateral, como o jogo recomeça? | Com arremesso lateral | Com tiro de meta | Com escanteio
Se a bola sai pela linha de fundo tocada por último pelo atacante, o que é marcado? | Tiro de meta | Escanteio | Lateral
O que significa "hat-trick"? | Três gols do mesmo jogador numa partida | Três vitórias seguidas | Três cartões
Qual é a circunferência oficial aproximada da bola? | De 68 a 70 cm | De 50 a 55 cm | De 80 a 85 cm`),

  tema("Raciocínio lógico", 0.7, ["raciocinio logico", "logica", "raciocinio"], ["Proposições e conectivos", "Sequências e problemas", "Argumentos e conjuntos"], `
Qual é a negação de "Todos os gatos são pretos"? | Algum gato não é preto | Nenhum gato é preto | Todos os gatos são brancos
Qual é a negação de "Algum aluno passou"? | Nenhum aluno passou | Todos os alunos passaram | Algum aluno não passou
Qual é a negação de "Chove e faz frio"? | Não chove ou não faz frio | Não chove e não faz frio | Chove ou faz frio
Qual é a negação de "Estudo ou trabalho"? | Não estudo e não trabalho | Não estudo ou não trabalho | Estudo e trabalho
Quando a frase "Se chove, então a rua molha" é falsa? | Quando chove e a rua não molha | Quando não chove e a rua molha | Quando não chove e a rua não molha
Qual é a contrapositiva de "Se P, então Q"? | Se não Q, então não P | Se Q, então P | Se não P, então não Q
Qual é a negação de "Se estudo, então passo"? | Estudo e não passo | Não estudo e passo | Se não estudo, então não passo
Quando a conjunção "P e Q" é verdadeira? | Quando P e Q são verdadeiras | Quando pelo menos uma é verdadeira | Quando ambas são falsas
Quando a disjunção "P ou Q" é falsa? | Quando P e Q são falsas | Quando só P é falsa | Quando ambas são verdadeiras
Quando a bicondicional "P se e somente se Q" é verdadeira? | Quando P e Q têm o mesmo valor lógico | Quando P é verdadeira e Q é falsa | Quando P e Q têm valores diferentes
O que é uma tautologia? | Uma proposição sempre verdadeira | Uma proposição sempre falsa | Uma proposição às vezes verdadeira
O que é uma contradição? | Uma proposição sempre falsa | Uma proposição sempre verdadeira | Uma proposição que depende dos valores
Quantas linhas tem a tabela-verdade de 3 proposições simples? | 8 | 6 | 9
Quantas linhas tem a tabela-verdade de 4 proposições simples? | 16 | 8 | 12
"P ou não P" é um exemplo de... | Tautologia | Contradição | Contingência
"Se P, então Q" equivale a... | Não P ou Q | P e não Q | Não P e Q
Qual é a negação de "Ninguém é perfeito"? | Alguém é perfeito | Todos são perfeitos | Ninguém é imperfeito
Qual é o próximo número: 2, 4, 8, 16, ...? | 32 | 24 | 20
Qual é o próximo número: 1, 1, 2, 3, 5, 8, ...? | 13 | 11 | 12
Qual é o próximo número: 3, 6, 9, 12, ...? | 15 | 14 | 18
Qual é o próximo número: 1, 4, 9, 16, 25, ...? | 36 | 30 | 49
Qual é o próximo número: 2, 3, 5, 7, 11, ...? | 13 | 12 | 15
Qual é o próximo número: 100, 90, 81, 73, ...? | 66 | 64 | 65
Qual é a próxima letra: A, C, E, G, ...? | I | H | J
Se 3 pedreiros fazem um muro em 6 dias, em quantos dias 6 pedreiros fazem o mesmo muro? | 3 dias | 12 dias | 6 dias
Qual é o menor ângulo entre os ponteiros de um relógio às 3h? | 90° | 45° | 120°
Se hoje é segunda-feira, que dia será daqui a 10 dias? | Quinta-feira | Quarta-feira | Sexta-feira
Ana é mais alta que Bia, e Bia é mais alta que Carla. Quem é a mais baixa? | Carla | Bia | Ana
Pedro é o 5º da fila de frente para trás e o 8º de trás para frente. Quantas pessoas há na fila? | 12 | 13 | 11
Quantos apertos de mão ocorrem entre 5 pessoas, se cada uma cumprimenta todas as outras uma vez? | 10 | 20 | 25
De quantas formas 3 pessoas podem se sentar em 3 cadeiras em fila? | 6 | 3 | 9
Um produto de R$ 200 teve 10% de desconto. Quanto custa agora? | R$ 180 | R$ 190 | R$ 160
Se 20% de um número é 30, qual é o número? | 150 | 60 | 120
Um trem percorre 120 km em 2 horas. Qual é a velocidade média? | 60 km/h | 40 km/h | 240 km/h
Qual é a probabilidade de sair cara ao lançar uma moeda honesta? | 1/2 | 1/3 | 1/4
"Todos os homens são mortais; Sócrates é homem." O que se conclui? | Sócrates é mortal | Sócrates é imortal | Todos os mortais são homens
Como se chama o raciocínio que parte de premissas gerais para uma conclusão particular? | Dedutivo | Indutivo | Abdutivo
Quando um argumento é válido? | Quando a conclusão decorre necessariamente das premissas | Quando as premissas são verdadeiras | Quando a conclusão é verdadeira
"Se chove, a rua molha. Choveu. Logo, a rua molhou." Que forma é essa? | Modus ponens | Modus tollens | Falácia
"Se chove, a rua molha. A rua não molhou. Logo, não choveu." Que forma é essa? | Modus tollens | Modus ponens | Silogismo disjuntivo
"Se chove, a rua molha. A rua molhou. Logo, choveu." Esse argumento é... | Uma falácia | Modus ponens | Modus tollens
Numa turma de 30 alunos, 18 gostam de matemática, 15 de português e 5 das duas. Quantos não gostam de nenhuma? | 2 | 3 | 0
Qual é a união de A = {1, 2} e B = {2, 3}? | {1, 2, 3} | {2} | {1, 3}
Qual é a interseção de A = {1, 2, 3} e B = {2, 3, 4}? | {2, 3} | {1, 4} | {1, 2, 3, 4}
Quantos subconjuntos tem um conjunto com 3 elementos? | 8 | 6 | 3
O conjunto vazio está contido em... | Todo conjunto | Nenhum conjunto | Apenas nele mesmo
Se todo A é B e todo B é C, então... | Todo A é C | Todo C é A | Nenhum A é C
"Alguns médicos são ricos. Todos os ricos viajam." Qual conclusão é válida? | Alguns médicos viajam | Todos os médicos viajam | Nenhum médico viaja
Se nenhum peixe é mamífero e todo golfinho é mamífero, então... | Nenhum golfinho é peixe | Algum golfinho é peixe | Todo peixe é golfinho
Se A tem 5 elementos, B tem 4 e A ∩ B tem 2, quantos elementos tem A ∪ B? | 7 | 9 | 11
Qual é a diferença A − B, com A = {1, 2, 3} e B = {3, 4}? | {1, 2} | {4} | {3}
O que contém o complementar de A em relação ao conjunto universo U? | Os elementos de U que não estão em A | Os elementos de A | O conjunto vazio`),

  tema("Novelas brasileiras", 0.5, ["novelas", "novela", "novelas brasileiras", "telenovelas"], ["Novelas clássicas", "Personagens marcantes", "Autores e bastidores"], `
Qual emissora é a maior produtora de novelas do Brasil? | TV Globo | SBT | Record
Em qual novela de 1988 o Brasil perguntava "Quem matou Odete Roitman?"? | Vale Tudo | Roque Santeiro | Tieta
Quem interpretou Odete Roitman na versão original de Vale Tudo? | Beatriz Segall | Fernanda Montenegro | Regina Duarte
Qual novela se passava na cidade fictícia de Asa Branca? | Roque Santeiro | Tieta | Saramandaia
Qual vilã de "Avenida Brasil" ficou famosa? | Carminha | Nazaré Tedesco | Flora
Quem interpretou Carminha em "Avenida Brasil"? | Adriana Esteves | Glória Pires | Cláudia Raia
Nazaré Tedesco é a vilã de qual novela? | Senhora do Destino | A Favorita | Laços de Família
Quem interpretou Nazaré Tedesco? | Renata Sorrah | Susana Vieira | Patrícia Pillar
Em que ano "Avenida Brasil" foi exibida? | 2012 | 2008 | 2016
Em qual novela de 2008 a vilã Flora foi vivida por Patrícia Pillar? | A Favorita | Paraíso Tropical | Caminho das Índias
Qual novela de 2009 se passava em parte na Índia? | Caminho das Índias | O Clone | Salve Jorge
"O Clone" se passava em parte em qual país? | Marrocos | Turquia | Índia
Em qual novela Giovanna Antonelli viveu a personagem Jade? | O Clone | Laços de Família | Mulheres Apaixonadas
Em qual novela Mateus Solano viveu o vilão Félix? | Amor à Vida | Fina Estampa | Avenida Brasil
Em que ano "Pantanal" ganhou remake na Globo? | 2022 | 2018 | 2015
Qual emissora exibiu a versão original de "Pantanal", em 1990? | TV Manchete | TV Globo | SBT
Em qual novela aparecia a Viúva Porcina? | Roque Santeiro | Tieta | Gabriela
Quem interpretou a protagonista de "Tieta", em 1989? | Betty Faria | Sônia Braga | Regina Duarte
Quem estrelou "Gabriela", em 1975? | Sônia Braga | Betty Faria | Juliana Paes
Qual escritor criou "Gabriela, Cravo e Canela", que inspirou a novela? | Jorge Amado | Erico Verissimo | Nelson Rodrigues
Quem escreveu "Avenida Brasil"? | João Emanuel Carneiro | Gloria Perez | Walcyr Carrasco
Gloria Perez é autora de qual novela? | O Clone | Avenida Brasil | Vale Tudo
Qual autor escreveu "Vale Tudo" com Aguinaldo Silva e Leonor Bassères? | Gilberto Braga | Manoel Carlos | Benedito Ruy Barbosa
As protagonistas chamadas "Helena" são marca de qual autor? | Manoel Carlos | Silvio de Abreu | Walcyr Carrasco
Qual novela foi escrita por Benedito Ruy Barbosa? | Pantanal | Avenida Brasil | O Clone
Qual novela infantil do SBT fez sucesso em 2012? | Carrossel | Malhação | Sítio do Picapau Amarelo
"Chiquititas" é uma novela de origem... | Argentina | Mexicana | Portuguesa
Em "Fina Estampa", qual era o nome do mordomo vivido por Marcelo Serrado? | Crô | Félix | Nicolau
Qual era o apelido da protagonista Griselda em "Fina Estampa"? | Pereirão | Dona Bela | Tia Nena
Quem interpretou Griselda em "Fina Estampa"? | Lília Cabral | Regina Duarte | Fernanda Montenegro
Quem interpretou Bibi Perigosa em "A Força do Querer"? | Juliana Paes | Paolla Oliveira | Grazi Massafera
Quem escreveu "A Força do Querer"? | Gloria Perez | Manoel Carlos | Aguinaldo Silva
Qual era o nome da protagonista de "Avenida Brasil", vivida por Débora Falabella? | Nina | Suelen | Monalisa
Qual era o nome da protagonista de "Senhora do Destino", vivida por Susana Vieira? | Maria do Carmo | Nazaré | Lindalva
Quem interpretou Roque Santeiro? | José Wilker | Lima Duarte | Tarcísio Meira
Quem interpretou Sinhozinho Malta em "Roque Santeiro"? | Lima Duarte | José Wilker | Antônio Fagundes
Qual foi a primeira novela em cores da TV brasileira? | O Bem-Amado | Irmãos Coragem | Selva de Pedra
Em qual cidade ficam os Estúdios Globo? | Rio de Janeiro | São Paulo | Belo Horizonte
Qual era o nome antigo dos Estúdios Globo? | Projac | Globolândia | TV Rio
Como é chamado o horário nobre de novelas da Globo? | Novela das nove | Novela das seis | Novela das onze
Quem interpretou Maria Clara Diniz em "Celebridade"? | Malu Mader | Cláudia Abreu | Letícia Spiller
Quem interpretou Odorico Paraguaçu em "O Bem-Amado"? | Paulo Gracindo | Lima Duarte | Tarcísio Meira
Qual novela se passava na cidade fictícia de Sucupira? | O Bem-Amado | Roque Santeiro | Saramandaia
Tarcísio Meira e Glória Menezes formavam um casal... | Na vida real e nas novelas | Só nas novelas | Só no teatro
Em qual novela do SBT aparece a personagem Maria Joaquina? | Carrossel | Chiquititas | Cúmplices de um Resgate
Qual emissora produziu "Os Dez Mandamentos", de 2015? | Record | Globo | SBT
Qual é o tema de "Os Dez Mandamentos"? | Bíblico | Policial | Ficção científica
Qual autor escreveu "Fina Estampa" e "Senhora do Destino"? | Aguinaldo Silva | Walcyr Carrasco | Manoel Carlos
Qual autor escreveu "Amor à Vida"? | Walcyr Carrasco | Gloria Perez | Aguinaldo Silva
Quantos capítulos por semana as novelas costumam ter na TV aberta? | Seis, de segunda a sábado | Cinco | Sete
Além do Brasil, qual país é famoso por novelas como "Maria do Bairro"? | México | Espanha | Itália
Qual emissora exibiu "Maria do Bairro" no Brasil? | SBT | Globo | Record`)
];

// Normaliza o texto do tema para comparar com os apelidos (sem acento, minúsculo, espaços simples).
export const normalizarTema = t => String(t || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
export const temaPronto = texto => { const n = normalizarTema(texto); return TEMAS_PRONTOS.find(t => t.apelidos.includes(n) || normalizarTema(t.titulo) === n) || null; };
