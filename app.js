document.getElementById('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('search-query').value;
  const resultsDiv = document.getElementById('results');
  
  // Clear previous results
  resultsDiv.innerHTML = '';

  try {
    const response = await fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    // Display answer
    resultsDiv.innerHTML = `
      <div class="answer">
        <p>${data.answer}</p>
      </div>
      <div class="sources">
        ${data.sources.map(source => `
          <div class="source">
            <a href="${source.link}" target="_blank">${source.title}</a>
            <p>${source.snippet}</p>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Error:', error);
    resultsDiv.innerHTML = '<p class="error">an error occurred while fetching results.</p>';
  }
});
