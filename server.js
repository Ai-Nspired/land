import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

async function searchWithSerper(query) {
  const url = 'https://google.serper.dev/search';
  const headers = {
    'X-API-KEY': SERPER_API_KEY,
    'Content-Type': 'application/json',
  };
  const data = { q: query };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data.organic || [];
  } catch (error) {
    console.error('Serper API Error:', error);
    return [];
  }
}

async function callCloudflareLLM(query, context) {
  const url = `https://api.cloudflare.com/client/v4/accounts/771ee2cc20f09248129114b7535b2cc9/ai/run/@cf/meta/llama-3-8b-instruct`;
  const headers = {
    Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const data = {
    messages: [
      { role: 'system', content: context },
      { role: 'user', content: query },
    ],
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data.result.response;
  } catch (error) {
    console.error('Cloudflare LLM Error:', error);
    return 'An error occurred while generating the response.';
  }
}

function getSnippetsForPrompt(snippets) {
  return snippets.map((snippet, i) => `[citation:${i + 1}] ${snippet.snippet}`).join('\n\n');
}

function setupGetAnswerPrompt(snippets) {
  const startingContext = `
    You are an assistant. You will be given a question and citations. Respond with an answer using the citations, citing them as [citation:x]. Then, provide 3 related follow-up questions in JSON array format. Do not repeat the original question.
    Citations:
  `;
  return `${startingContext}\n\n${getSnippetsForPrompt(snippets)}`;
}

app.post('/search', async (req, res) => {
  const { query } = req.body;

  try {
    const snippets = await searchWithSerper(query);
    const answerPromptContext = setupGetAnswerPrompt(snippets);
    const answer = await callCloudflareLLM(query, answerPromptContext);
    
    res.json({ 
      sources: snippets.map(s => ({
        title: s.title,
        link: s.link,
        snippet: s.snippet
      })), 
      answer 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
