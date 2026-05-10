// github.route.js — аналітика спільних contributors між репозиторіями

export default async function githubRoutes(fastify) {
  // токен підвищує ліміт з 60 до 5000 запитів/год
  const getHeaders = () => {
    const headers = { Accept: 'application/vnd.github+json' };
    if (fastify.config.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${fastify.config.GITHUB_TOKEN}`;
    }
    return headers;
  };

  // GitHub віддає по 100 за раз — збираємо всі сторінки
  const getContributors = async (repo) => {
    const contributors = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contributors?per_page=100&page=${page}`,
        { headers: getHeaders() }
      );
      if (res.status === 204) break;
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const data = await res.json();
      if (data.length === 0) break;
      contributors.push(...data.map((c) => c.login));
      if (data.length < 100) break;
      page++;
    }
    return contributors;
  };

  // репо організації — там найбільше перетинів з contributors
  const getOrgRepos = async (org) => {
    const res = await fetch(
      `https://api.github.com/orgs/${org}/repos?per_page=100&type=public`,
      { headers: getHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((r) => r.full_name);
  };

  // contributors конкретного репо (перша сторінка — достатньо для порівняння)
  const getRepoContributors = async (repo) => {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contributors?per_page=100`,
      { headers: getHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((c) => c.login);
  };

  // спільна логіка для v1 і v2 — повертає топ-5
  const findSharedRepos = async (repo, getCandidateRepos) => {
    // крок 1: contributors цільового репо
    const targetContributors = new Set(await getContributors(repo));

    // крок 2: список репо-кандидатів для порівняння
    const candidateRepos = await getCandidateRepos(repo, targetContributors);

    // крок 3: для кожного кандидата рахуємо перетин contributors
    const results = [];

    for (const candidateRepo of candidateRepos) {
      if (candidateRepo === repo) continue;

      const candidateContributors = await getRepoContributors(candidateRepo);

      // перетин: хто є і там і там
      const shared = candidateContributors.filter((c) =>
        targetContributors.has(c)
      );

      if (shared.length > 0) {
        results.push({
          repo: candidateRepo,
          sharedContributors: shared.length,
          contributors: shared,
        });
      }
    }

    return {
      targetContributors,
      results: results
        .sort((a, b) => b.sharedContributors - a.sharedContributors)
        .slice(0, 5),
    };
  };

  // v1 — REST: кандидати = репо організації власника
  fastify.get(
    '/api/v1/github/shared-repos',
    {
      schema: {
        description: 'Топ-5 репозиторіїв зі спільними contributors (REST API)',
        tags: ['github'],
        querystring: {
          type: 'object',
          required: ['repo'],
          properties: {
            repo: { type: 'string', description: 'наприклад: fastify/fastify' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              repo: { type: 'string' },
              totalContributors: { type: 'integer' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    repo: { type: 'string' },
                    sharedContributors: { type: 'integer' },
                    contributors: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { repo } = request.query;
      fastify.log.info(`[v1] Analyzing: ${repo}`);

      // кандидати через REST — репо тієї ж організації
      const getCandidates = async (targetRepo) => {
        const org = targetRepo.split('/')[0];
        return getOrgRepos(org);
      };

      const { targetContributors, results } = await findSharedRepos(
        repo,
        getCandidates
      );

      return reply.send({
        repo,
        totalContributors: targetContributors.size,
        results,
      });
    }
  );

  // v2 — GraphQL: кандидати через GraphQL — репо організації + пов'язані теми
  fastify.get(
    '/api/v2/github/shared-repos',
    {
      schema: {
        description: 'Топ-5 репозиторіїв зі спільними contributors (GraphQL)',
        tags: ['github'],
        querystring: {
          type: 'object',
          required: ['repo'],
          properties: {
            repo: { type: 'string', description: 'наприклад: fastify/fastify' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              repo: { type: 'string' },
              totalContributors: { type: 'integer' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    repo: { type: 'string' },
                    sharedContributors: { type: 'integer' },
                    contributors: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { repo } = request.query;
      fastify.log.info(`[v2] Analyzing: ${repo}`);

      // кандидати через GraphQL — отримуємо репо організації одним запитом
      const getCandidates = async (targetRepo) => {
        const org = targetRepo.split('/')[0];

        const query = `{
        organization(login: "${org}") {
          repositories(first: 100, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
            nodes { nameWithOwner }
          }
        }
      }`;

        const res = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) return [];
        const data = await res.json();
        if (data.errors) return [];

        return (
          data.data?.organization?.repositories?.nodes?.map(
            (n) => n.nameWithOwner
          ) ?? []
        );
      };

      const { targetContributors, results } = await findSharedRepos(
        repo,
        getCandidates
      );

      return reply.send({
        repo,
        totalContributors: targetContributors.size,
        results,
      });
    }
  );
}
