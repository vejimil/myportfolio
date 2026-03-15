/*
  ============================
  EASY CONTENT EDITING GUIDE
  ============================
  1) Add or remove project cards in portfolioData.projects.
  2) Update the About Me page in portfolioData.about.
  3) Main page cards and detail pages are rendered from the same data.
  4) Each project opens its own HTML file, such as world-of-words.html.
*/

const portfolioData = {
  projects: [
    {
      id: 'world-of-words',
      page: 'world-of-words.html',
      label: 'Language Learning Platform',
      title: 'World of Words',
      blurb:
        'A language-learning platform that turns vocabulary study into structured quizzes and replayable mini-games.',
      caption:
        'Planned, designed, and built solo, from content logic and interface flow to interaction design and game systems.',
      meta: ['Language Learning', 'Content Logic', 'Frontend Development'],
      tags: ['Language Learning', 'Content Logic', 'Frontend Development'],
      detail: {
        kicker: 'Case Study',
        subtitle: 'A beginner-friendly vocabulary platform designed to make word study feel clearer, more active, and easier to return to.',
        summary:
          'World of Words is a language-learning platform for beginners who want vocabulary study to feel more engaging and less repetitive. It supports early-stage learners across Japanese, French, and Spanish through structured quizzes, review flows, and lightweight game modes built around vocabulary up to roughly A2 level.',
        overview: [
          'This project began with a frustration I often felt while studying languages. Many vocabulary tools are useful, but they still feel close to digital word lists: the same fixed question types, flat word–meaning pairs, and not much sense of interaction or momentum.',
          'I approached World of Words as a system design problem. Instead of presenting static content, I built a structure that can generate questions from word sets, choose more natural language pairings, and turn vocabulary review into something clearer, more replayable, and more alive.'
        ],
        media: [
          {
            src: 'worldofwordsmain.png',
            alt: 'World of Words quiz setup page with language selection and quiz settings.',
            title: 'Quiz Setup Flow',
            caption:
              'The main screen is kept simple and readable so beginners can start quickly without feeling overwhelmed.'
          },
          {
            src: 'worldofwordsfrench.png',
            alt: 'French quiz question screen showing multiple-choice answers and immediate feedback.',
            title: 'Clear Question UI',
            caption:
              'Question screens focus on legibility, immediate response, and a steady study rhythm rather than visual clutter.'
          },
          {
            src: 'worldofwordsresult.png',
            alt: 'Quiz result screen listing the score and incorrectly answered vocabulary.',
            title: 'Review-Friendly Results',
            caption:
              'Results are not just an ending screen—they are part of the learning loop, making weak words easy to revisit.'
          },
          {
            src: 'worldofwordsgamemain.png',
            alt: 'World of Words game mode main screen with language selection buttons.',
            title: 'Game Mode Entry',
            caption:
              'The game section carries a stronger visual identity while staying connected to the learning purpose of the product.'
          },
          {
            src: 'worldofwordsgamejapanese.png',
            alt: 'Japanese vocabulary game screen with floating word cards and matching answers.',
            title: 'Meaning Matching in Motion',
            caption:
              'Rather than testing typing speed, the game mode focuses on recognition, attention, and word–meaning connection.'
          },
          {
            src: 'worldofwordsgamespanish.png',
            alt: 'Spanish vocabulary game screen with floating definition cards and answer choices.',
            title: 'Playable Study',
            caption:
              'The mini-game format adds energy and personality, helping repetition feel more like play than routine drill.'
          },
          {
            src: 'worldofwordsmobilequiz.jpg',
            alt: 'World of Words Japanese vocabulary quiz displayed on a mobile screen in portrait orientation.',
            title: 'Mobile Quiz Experience',
            orientation: 'portrait',
            caption:
              'Since vocabulary review often happens in short spare moments while moving, the quiz flow was designed to stay readable, tappable, and comfortable on mobile screens as well.'
          },
          {
            src: 'worldofwordsmobilegame.jpg',
            alt: 'World of Words Acid Rain mini-game displayed on a mobile screen in portrait orientation.',
            title: 'Mobile-Friendly Game Mode',
            orientation: 'portrait',
            caption:
              'The mini-game layouts were also adjusted for vertical mobile play so users can enjoy a quick session during small gaps in the day without losing clarity or control.'
          }
        ],
        sections: [
          {
            heading: 'Core goals',
            type: 'list',
            content: [
              'Make vocabulary study feel active instead of passive',
              'Support beginners with a low-friction, readable interface',
              'Make both quiz and game flows work comfortably on mobile for short study sessions on the go',
              'Cover useful vocabulary up to roughly A2 level through quizzes and mini-games',
              'Build a structure that can expand with more words, modes, and progression later'
            ]
          },
          {
            heading: 'Problems I wanted to solve',
            type: 'paragraph',
            content:
              'Traditional word practice often repeats the same quiz order, presents vocabulary as a flat list of meanings, and creates awkward translations when linguistically distant languages are forced into one direct pairing. That makes the experience feel mechanical and, at times, unnatural.'
          },
          {
            heading: 'Design responses',
            type: 'list',
            content: [
              'Questions are generated randomly from vocabulary sets instead of repeating one fixed sheet',
              'For Japanese, the system can generate items in a JLPT-style format so the experience feels closer to real exam exposure',
              'Language directions are grouped more naturally: Korean–Japanese, English–French, and English–Spanish',
              'Immediate feedback, score screens, and error review help learners keep momentum and return to weak words'
            ]
          },
          {
            heading: 'Designed for quick mobile use',
            type: 'paragraph',
            content:
              'I expected many learners to use this kind of vocabulary quiz in short bursts—while commuting, waiting, or filling a small gap in the day. Because of that, I made sure the experience also works well on mobile. Visual hierarchy, button size, readability, and feedback were all designed so the product still feels clear and comfortable on smaller screens, not just on desktop.'
          },
          {
            heading: 'What makes it fun',
            type: 'paragraph',
            content:
              'I wanted the product to feel useful, but not dry. Small character elements—such as Nihongorae—add warmth and memorability, while the overall interface stays controlled enough to remain a practical study tool rather than becoming a distraction.'
          },
          {
            heading: 'Game design thinking',
            type: 'list',
            content: [
              'Inspired by typing games, but redesigned around meaning recognition rather than keyboard speed',
              'Explored how word–meaning matching could become a real game interaction instead of a static exercise',
              'Switched from direct typing to dragging or clicking for smoother play and lower fatigue',
              'Kept the challenge centered on comprehension, speed of recognition, and attention'
            ]
          },
          {
            heading: 'Solo development process',
            type: 'paragraph',
            content:
              'I handled the planning, design, development, and content structure myself. I also used AI tools as part of the workflow, mainly to speed up exploration and support implementation. But the project direction, system design, content judgment, debugging, and final decisions were all mine. The important part was not just generating output, but deciding what fit the product and fixing what did not.'
          },
          {
            heading: 'Why this project matters to me',
            type: 'paragraph',
            content:
              'I built this during my mandatory military service, in a limited environment and largely on my own. Because of that, the project means more to me than a single website. It became proof that I can keep learning under constraints and carry an idea far enough to make it real.'
          }
        ],
        sidebar: {
          role: 'Planning, UX/UI Design, Frontend Development, Content System Design',
          stack: ['HTML', 'CSS', 'JavaScript', 'Quiz Generation', 'Game Interaction', 'Solo Production'],
          notes: [
            'Designed, written, and iterated entirely as a solo project',
            'Built for beginner learners studying vocabulary up to roughly A2 level',
            'Combines quiz flow, randomized content logic, and playful mini-game interaction',
            'Shows how I work under constraints: structured, persistent, and hands-on'
          ]
        },
        links: [
          {
            label: 'Visit Live Site',
            href: 'https://www.world-of-words.org'
          }
        ]
      }
    },

    {
      id: 'triends',
      page: 'triends.html',
      label: 'Co-op Adventure Game',
      title: 'Triends',
      blurb:
        'A two-player 2D adventure game where human technology and plant powers combine to solve environmental puzzles.',
      caption:
        'Built as a team project during military service, with my role spanning planning, character design, light-puzzle level design, and development.',
      meta: ['Co-op Adventure', 'Pixel Character Design', 'Puzzle Level Design'],
      tags: ['Co-op Adventure', 'Pixel Character Design', 'Puzzle Level Design'],
      detail: {
        kicker: 'Team Project',
        subtitle: 'A cooperative 2D adventure shaped by constraint, teamwork, AI-assisted asset making, and light-based puzzle design.',
        summary:
          'Triends is a two-player 2D adventure game about an astronaut stranded on a plant planet and the local character Insam journeying together through puzzles and obstacles. The astronaut uses human technology while Insam uses plant-based abilities, so the game was designed around cooperation, contrast, and complementary actions.',
        overview: [
          'This was a team project built with one teammate during military service. We joined a contest connected to the AI asset-making tool GameAIfy, while working under clear limitations: a restricted environment, no access to a full professional production setup, and little prior experience with this kind of direct game-art workflow.',
          'Because of those constraints, the project became an experiment in making something expressive with the tools we could access. We used Phaser for development, mixed AI-assisted asset generation with manual editing, and kept refining the project until the characters, movement, and puzzle ideas felt intentional rather than merely generated.'
        ],
        media: [
          {
            src: 'triends-reference.jpg',
            alt: 'Reference sheet showing top-down four-direction pixel character movement inspiration.',
            title: 'Movement Reference and Direction Study',
            caption:
              'Before settling the final character work, I studied readable four-direction sprite language and how movement could stay clear in a small top-down pixel scale.'
          },
          {
            src: 'triends-character-sheet.png',
            alt: 'Astronaut pixel character sheet including front, side, and back views and a mirror-carrying walking pose.',
            title: 'Astronaut Character Sheet',
            caption:
              'The final astronaut sprite grew from AI-assisted concept generation into a manually adjusted pixel character sheet, including custom edits for poses and interaction states.'
          },
          {
            src: 'triends-pixel-edit.jpg',
            alt: 'Pixel-art editing process image showing direct manual dot work on the character design.',
            title: 'Manual Pixel Editing',
            caption:
              'Because AI could not fully produce the exact style or motion I wanted, I edited the sprite work by hand, adding and cleaning pixels until the result felt closer to the intended character.'
          }
        ],
        sections: [
          {
            heading: 'Project setup',
            type: 'list',
            content: [
              'Built as a two-person team project during military service',
              'Created for a contest related to the AI asset tool GameAIfy',
              'Developed in Phaser under practical production constraints',
              'Designed as a cooperative 2D adventure rather than a single-character puzzle game'
            ]
          },
          {
            heading: 'My role',
            type: 'paragraph',
            content:
              'I worked across planning, character design, level design, and development. That meant helping define the game concept, shaping the visual direction of the characters, building the light-puzzle section, and contributing directly to implementation rather than staying only at the concept stage.'
          },
          {
            heading: 'Prototype and direction',
            type: 'paragraph',
            media: {
              type: 'video',
              src: 'triends-prototype.mp4'
            },
            content:
              'The early prototype helped us test whether the world, characters, and cooperative structure could feel coherent. More than just proving that the game worked, it let us check whether the contrast between technology and plant power could create a distinctive identity.'
          },
          {
            heading: 'Character design process',
            type: 'paragraph',
            content:
              'I began by defining the character concept and repeatedly prompting AI tools to push toward the look I wanted. But the generated output never fully matched my intent. To close that gap, I manually edited the sprites, added pixel details myself, and adjusted motion frames on top of the generated base. That process taught me how to use AI as a starting point rather than a final answer.'
          },
          {
            heading: 'Light-based puzzle level design',
            type: 'paragraph',
            media: {
              type: 'video',
              src: 'triends-light-gimmick.mp4'
            },
            content:
              'I designed the light section of the game. It was inspired by the image of a sunflower-like light plant: in this part, Insam can transform into a sunflower and fire light, while the astronaut can hold a mirror and split the beam. I designed the level flow so players first learn the simplest version of the mechanic, then gradually rely on beam-splitting and more deliberate coordination to reach the goal. The puzzle logic was not just “harder over time.” I wanted the layout to teach the gimmick, deepen it, and finally require both characters to use their own roles well for the stage to feel fair and satisfying.'
          },
          {
            heading: 'What I learned',
            type: 'paragraph',
            content:
              'This project taught me several things at once: how to collaborate with a teammate for the first time, how to establish shared coding rules and working habits, how to turn AI output into something more intentional through editing, and how to think about level design as player experience rather than just obstacle placement. It also gave me the satisfaction of seeing a character move naturally after hands-on sprite and animation work.'
          }
        ],
        sidebar: {
          role: 'Planning, Character Design, Light-Puzzle Level Design, Development',
          stack: ['Phaser', 'Co-op Puzzle Design', 'Pixel Art Editing', 'AI-Assisted Asset Workflow', 'Team Collaboration'],
          notes: [
            'Built with one teammate during military service',
            'Created for a GameAIfy-related contest under production constraints',
            'Combined AI-generated starting points with manual pixel editing and animation adjustment',
            'Designed so both player characters needed to use their own abilities to progress'
          ]
        },
        links: [
          {
            label: 'Watch Prototype Clip',
            href: 'triends-prototype.mp4'
          },
          {
            label: 'Watch Light Puzzle Clip',
            href: 'triends-light-gimmick.mp4'
          }
        ]
      }
    },
    {
      id: 'arcade-games',
      page: 'arcade-games.html',
      label: 'Arcade Game Collection',
      title: 'Arcade Games',
      blurb:
        'A two-player arcade game collection built for quick, satisfying play in a limited offline environment.',
      caption:
        'Made for short local sessions, then tuned through direct feedback from the people actually playing them.',
      meta: ['Arcade Design', 'Feedback-Driven Tuning', 'Game Development'],
      tags: ['Arcade Design', 'Feedback-Driven Tuning', 'Game Development'],
      detail: {
        kicker: 'Project Group',
        subtitle: 'Two-player arcade games shaped by simple rules, fast iteration, and real player feedback.',
        summary:
          'Arcade Games is a grouped project page for small two-player games I built in a restricted offline environment during military service. With limited phone use and network access, I focused on lightweight local games that colleagues could understand quickly and enjoy together on a single screen.',
        overview: [
          'These games were shaped by constraint. They were designed for short offline sessions where clarity, accessibility, and immediate fun mattered more than scale.',
          'For this portfolio, I later ported them into browser-playable JavaScript versions so visitors can move from watching to playing.',
          'The limitation itself became a design lens. Starting from classic game structures and simple forms, I explored what makes a small game feel exciting: pace, impact, variation, readability, and the sense that each input matters.'
        ],
        sections: [
          {
            heading: 'Core idea',
            type: 'paragraph',
            content:
              'This project began with a practical situation: in a place where both devices and network conditions were limited, I wanted to make games that could still create shared fun. That led me to compact two-player games designed for one screen, quick setup, and immediate understanding. Rather than relying on scale, I focused on creating enjoyment inside a limited space.'
          },
          {
            heading: 'Design focus',
            type: 'list',
            content: [
              'Create quick two-player games that are easy to start and easy to read on a single screen',
              'Use familiar classic-game foundations, then reshape them through new mechanics and tuning',
              'Use timing, feedback, and pacing to create stronger game feel',
              'Iterate through direct player reactions rather than relying only on theory'
            ]
          },
          {
            heading: 'Ping-Pong Smash',
            type: 'paragraph',
            media: {
              type: 'video',
              src: 'pingpongsmash.mp4'
            },
            actions: [
              {
                label: 'Play in Browser',
                href: 'ping-pong-smash.html',
                kind: 'primary'
              }
            ],
            content:
              'Ping-Pong Smash started from Pong, but I wanted to reinterpret it with a faster rhythm. Based on the way many people now consume short-form, fast-paced media, I felt a more immediate tempo would make the game more engaging in short local sessions. To do that, I added a smash mechanic that gives rallies more speed, tension, and physical satisfaction. It created moments of reaction, risk, and momentum shift, and I kept tuning the timing window and responsiveness through real player feedback.'
          },
          {
            heading: 'Space Duel',
            type: 'paragraph',
            media: {
              type: 'video',
              src: 'spaceduel.mp4'
            },
            actions: [
              {
                label: 'Play in Browser',
                href: 'space-duel.html',
                kind: 'primary'
              }
            ],
            content:
              'Space Duel began with a simpler question: how much game can grow from basic geometric shapes? I started with minimal forms and gradually built a combat loop around movement, shooting, health, items, and match variation. As players reacted to the game, I kept expanding the system, including a level-based bullet transformation mechanic so rounds would evolve over time rather than stay flat.'
          },
          {
            heading: 'What I learned',
            type: 'paragraph',
            content:
              'This project taught me that fun rarely comes from one idea alone. It emerges through rhythm, readability, feedback, variation, and repeated tuning based on how people actually play.'
          }
        ],
        sidebar: {
          role: 'Game Designer, Gameplay Programmer, Balance Tuner',
          stack: ['Python', 'Local Multiplayer Design', 'Gameplay Logic', 'Balancing', 'Feedback Iteration'],
          notes: [
            'Built for short local sessions in a restricted offline environment',
            'Includes Pong Smash and Space Duel as two complementary experiments',
            'Focused on how fun can emerge from simple rules, fast tuning, and direct player response',
            'Helped me explore the fundamentals of pacing, impact, variation, and game feel'
          ]
        },
        links: [
          {
            label: 'Play Ping-Pong Smash',
            href: 'ping-pong-smash.html'
          },
          {
            label: 'Play Space Duel',
            href: 'space-duel.html'
          }
        ]
      }
    }
  ],
  about: {
    title: 'About Me',
    kicker: 'About Me',
    subtitle: 'A cross-disciplinary designer shaped by games, fashion, curiosity, and hands-on making.',
    intro:
      'I study aesthetics, clothing and textiles, and industrial design at Seoul National University. Games have shaped the way I think for most of my life, not only in terms of play, but in how emotion, structure, rhythm, and interaction are designed. That way of thinking carries into the rest of my interests too, including fashion, languages, and music.',
    previewCards: [
      {
        label: 'Introduction',
        title: 'Who I am',
        copy: 'A student at Seoul National University with a long-standing interest in games, interaction, fashion, and cross-disciplinary design.',
        points: ['Games', 'Cross-Disciplinary Design']
      },
      {
        label: 'Experience',
        title: 'What has shaped me',
        copy: 'I grow most when I step into unfamiliar situations, learn quickly, and turn uncertainty into something real.',
        points: ['Fashion Show', 'Festival Planning']
      },
      {
        label: 'Approach',
        title: 'How I work',
        copy: 'I care about responsibility, depth, and respectful communication. I try to listen well, learn how other people work, and build trust through the process, not just the final result.',
        points: ['Responsibility', 'Listening']
      }
    ],
    sections: [
      {
        heading: 'Who I Am',
        type: 'paragraph',
        content:
          'I am currently studying aesthetics, clothing and textiles, and industrial design at Seoul National University. I have loved games since I was very young, from Nintendo to PlayStation to PC games, and they have stayed close to me ever since. That long relationship with games naturally led me toward interactive design, but I am equally energized by other fields such as fashion, foreign languages, and music. I like moving between different kinds of interests because each one changes the way I see beauty, people, and experience.'
      },
      {
        heading: 'Experiences That Shaped Me',
        type: 'paragraph',
        content:
          'A lot of my growth has come from entering spaces where I was not fully ready and deciding to learn through action. I am drawn to situations that ask for initiative, persistence, and the willingness to keep going even when the path is unfamiliar. That attitude has shaped the way I study, collaborate, and build projects.'
      },
      {
        heading: 'Stepping Into Fashion',
        type: 'paragraph',
        content:
          "One experience that shaped me deeply was joining my school's graduation fashion show before I knew how to make clothes. I loved fashion, but I had never learned garment construction. Instead of waiting until I felt ready, I contacted the professor directly and asked for a chance. Through steady effort, I completed three looks and later became planning team leader. That experience taught me that interest only becomes meaningful when it is carried by action, discipline, and responsibility."
      },
      {
        heading: 'Designing Fun Under Constraints',
        type: 'paragraph',
        content:
          'I also helped plan a university festival, where I worked on games and events. In a situation with a limited budget, I became interested in how to create raw, immediate fun using simple ideas. One example was a human curling event built with wheeled tubs and carefully prepared safety measures. It reminded me that memorable experiences do not always come from scale or expensive technology. They often come from understanding people, energy, rules, and surprise.'
      },
      {
        heading: 'Small Acts That Matter',
        type: 'paragraph',
        content:
          'Alongside project work, I also spent small pockets of time volunteering through meal service and donating meal vouchers. It was quiet work, but meaningful. It reminded me that kindness is not separate from creative work; the way we speak, listen, and treat people shapes collaboration just as much as technical skill.'
      },
      {
        heading: 'How I Work',
        type: 'paragraph',
        content:
          'When I take responsibility for something, I want to understand it properly and carry it through to a result I can be proud of. I try to study deeply, not just enough to finish the task, but enough to do it well. I also care a lot about communication. To work well with others, I try to learn their field, listen carefully, and approach collaboration with respect. I believe good teamwork begins not from speaking first, but from listening well.'
      },
      {
        heading: 'What Keeps Me Curious',
        type: 'paragraph',
        content:
          'Fashion, languages, music, and games are not separate interests to me. Together, they are part of the energy that keeps me moving. I care a lot about happiness in everyday life and try to be kind to the people around me. If one thoughtful word can make someone feel lighter, I think that matters. I want both the things I create and the way I work with others to carry that kind of warmth.'
      }
    ],
    quickKeywords: [
      'Interactive Design',
      'Game Thinking',
      'Experience Design',
      'Cross-Disciplinary Curiosity',
      'Responsibility',
      'Warm Collaboration'
    ],
    sidebarPanels: [
      {
        heading: 'Currently Studying',
        type: 'list',
        content: ['Aesthetics', 'Clothing and Textiles', 'Industrial Design']
      },
      {
        heading: 'Outside Work',
        type: 'list',
        content: ['Games', 'Fashion', 'Foreign Languages', 'Music', 'Community-minded work']
      },
      {
        heading: 'What I Want My Work to Feel Like',
        type: 'paragraph',
        content: "I want my work to feel thoughtful, alive, and generous—clear enough to use easily, but warm enough to stay in people's memory."
      }
    ]
  }
};

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    document.body.classList.toggle('menu-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function renderListItems(items) {
  return items.map((item) => `<li>${item}</li>`).join('');
}

function renderLinks(links) {
  if (!links || !links.length) {
    return '<p class="note-text">Project links can be added here later.</p>';
  }

  return `
    <div class="link-row">
      ${links.map((link) => `<a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`).join('')}
    </div>
  `;
}

function renderProjectMedia(media) {
  if (!media || !media.length) {
    return '';
  }

  return `
    <section class="detail-block">
      <h2>Selected Screens</h2>
      <div class="media-grid">
        ${media
          .map(
            (item) => `
              <figure class="media-card${item.orientation === 'portrait' ? ' is-portrait' : ''}">
                <img src="${item.src}" alt="${item.alt}" loading="lazy" />
                <figcaption class="media-copy">
                  <h4>${item.title}</h4>
                  <p>${item.caption}</p>
                </figcaption>
              </figure>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}


function renderSectionMedia(media) {
  if (!media) {
    return '';
  }

  if (media.type === 'video') {
    return `
      <div class="section-media">
        <video class="section-video" autoplay muted loop playsinline controls preload="metadata">
          <source src="${media.src}" type="${media.src.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'}" />
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  }

  return '';
}

function renderSectionActions(actions) {
  if (!actions || !actions.length) {
    return '';
  }

  return `
    <div class="section-actions-inline">
      ${actions
        .map(
          (action) => `
            <a
              class="btn ${action.kind === 'primary' ? 'btn-primary' : 'btn-secondary'}"
              href="${action.href}"
              ${action.external ? 'target="_blank" rel="noreferrer"' : ''}
            >
              ${action.label}
            </a>
          `
        )
        .join('')}
    </div>
  `;
}

function renderHomeProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.innerHTML = portfolioData.projects
    .map(
      (project) => `
        <a class="project-card reveal" href="${project.page}">
          <div class="card-top">
            <div class="card-heading">
              <span class="card-label">${project.label}</span>
              <h3>${project.title}</h3>
              <div class="project-meta project-meta-inline">
                ${project.tags.slice(0, 3).map((item) => `<span>${item}</span>`).join('')}
              </div>
            </div>
            <span class="card-arrow" aria-hidden="true">↗</span>
          </div>
          <p class="project-copy">${project.blurb}</p>
          <p class="project-caption">${project.caption}</p>
        </a>
      `
    )
    .join('');
}

function renderAboutPreview() {
  const preview = document.getElementById('about-preview');
  if (!preview) return;

  preview.innerHTML = portfolioData.about.previewCards
    .map(
      (item) => `
        <a class="project-card about-card reveal" href="about.html">
          <div class="card-top">
            <div class="card-heading">
              <span class="card-label">${item.label}</span>
              <h3>${item.title}</h3>
                <div class="project-meta project-meta-inline">
                  ${item.points.slice(0, 2).map((point) => `<span>${point}</span>`).join('')}
                </div>
            </div>
            <span class="card-arrow" aria-hidden="true">↗</span>
          </div>
          <p class="project-copy">${item.copy}</p>
        </a>
      `
    )
    .join('');
}

function getProjectById(projectId) {
  return portfolioData.projects.find((project) => project.id === projectId) || null;
}

function renderProjectDetail() {
  const root = document.getElementById('project-detail-root');
  if (!root) return;

  const projectId = document.body.dataset.projectId || root.dataset.projectId || new URLSearchParams(window.location.search).get('project');
  const project = getProjectById(projectId);

  if (!project) {
    root.innerHTML = `
      <section class="empty-state">
        <a class="back-link" href="index.html#projects">← Back to Projects</a>
        <h2>Project not found</h2>
        <p class="note-text">This link does not match any current project page.</p>
      </section>
    `;
    return;
  }

  document.title = `${project.title} — Jimin`;

  root.innerHTML = `
    <section class="detail-page">
      <a class="back-link" href="index.html#projects">← Back to Projects</a>

      <header class="detail-hero">
        <span class="detail-kicker">${project.detail.kicker}</span>
        <h1>${project.title}</h1>
        <p class="detail-subtitle">${project.detail.subtitle}</p>
        <p class="detail-summary">${project.detail.summary}</p>
        <div class="detail-tags">
          ${project.tags.map((tag) => `<span>${tag}</span>`).join('')}
        </div>
        <div class="detail-actions">
          <a class="btn btn-secondary" href="index.html#projects">Back to Projects</a>
          ${project.detail.links?.length === 1 ? `<a class="btn btn-primary" href="${project.detail.links[0].href}" target="_blank" rel="noreferrer">${project.detail.links[0].label}</a>` : ''}
          <a class="btn btn-secondary" href="about.html">About Me</a>
        </div>
      </header>

      <div class="detail-layout">
        <div class="detail-content">
          <section class="detail-block">
            <h2>Overview</h2>
            ${project.detail.overview.map((paragraph) => `<p>${paragraph}</p>`).join('')}
          </section>

          ${renderProjectMedia(project.detail.media)}

          ${project.detail.sections
            .map((section) => {
              const sectionMedia = renderSectionMedia(section.media);
              const sectionActions = renderSectionActions(section.actions);

              if (section.type === 'list') {
                return `
                  <section class="detail-block">
                    <h3>${section.heading}</h3>
                    ${sectionMedia}
                    <ul>${renderListItems(section.content)}</ul>
                    ${sectionActions}
                  </section>
                `;
              }

              return `
                <section class="detail-block">
                  <h3>${section.heading}</h3>
                  ${sectionMedia}
                  <p>${section.content}</p>
                  ${sectionActions}
                </section>
              `;
            })
            .join('')}
        </div>

        <aside class="info-stack">
          <section class="info-panel">
            <h3>Role</h3>
            <p class="note-text">${project.detail.sidebar.role}</p>
          </section>

          <section class="info-panel">
            <h3>Tools / Focus</h3>
            <div class="project-meta">
              ${project.detail.sidebar.stack.map((item) => `<span>${item}</span>`).join('')}
            </div>
          </section>

          <section class="info-panel">
            <h3>Notes</h3>
            <ul>${renderListItems(project.detail.sidebar.notes)}</ul>
          </section>

          <section class="info-panel">
            <h3>Links</h3>
            ${renderLinks(project.detail.links)}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderAboutDetail() {
  const root = document.getElementById('about-detail-root');
  if (!root) return;

  const about = portfolioData.about;
  document.title = `${about.title} — Jimin`;

  root.innerHTML = `
    <section class="detail-page">
      <a class="back-link" href="index.html#about">← Back to Home</a>

      <header class="detail-hero">
        <span class="detail-kicker">${about.kicker}</span>
        <h1>${about.title}</h1>
        <p class="detail-subtitle">${about.subtitle}</p>
        <p class="detail-summary">${about.intro}</p>
        <div class="detail-actions">
          <a class="btn btn-secondary" href="index.html">Back to Home</a>
          <a class="btn btn-primary" href="index.html#projects">See Projects</a>
        </div>
      </header>

      <div class="detail-layout">
        <div class="detail-content">
          ${about.sections
            .map((section) => {
              if (section.type === 'list') {
                return `
                  <section class="detail-block">
                    <h2>${section.heading}</h2>
                    <ul>${renderListItems(section.content)}</ul>
                  </section>
                `;
              }

              return `
                <section class="detail-block">
                  <h2>${section.heading}</h2>
                  <p>${section.content}</p>
                </section>
              `;
            })
            .join('')}
        </div>

        <aside class="info-stack">
          ${about.sidebarPanels
            .map((panel) => {
              if (panel.type === 'list') {
                return `
                  <section class="info-panel">
                    <h3>${panel.heading}</h3>
                    <ul>${renderListItems(panel.content)}</ul>
                  </section>
                `;
              }

              return `
                <section class="info-panel">
                  <h3>${panel.heading}</h3>
                  <p class="note-text">${panel.content}</p>
                </section>
              `;
            })
            .join('')}
        </aside>
      </div>
    </section>
  `;
}

function initReveal() {
  const revealItems = document.querySelectorAll('.reveal');
  if (!revealItems.length || typeof IntersectionObserver === 'undefined') {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

const pageType = document.body.dataset.page;

if (pageType === 'home') {
  renderHomeProjects();
  renderAboutPreview();
}

if (pageType === 'project-detail') {
  renderProjectDetail();
}

if (pageType === 'about-detail') {
  renderAboutDetail();
}

initReveal();
