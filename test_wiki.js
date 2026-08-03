import fetch from 'node-fetch';

async function testWiki(movieTitle) {
  const searchUrl = `https://en.wikiquote.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(movieTitle)}&utf8=&format=json`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  let targetTitle = `${movieTitle} (film)`;
  if (searchData?.query?.search?.length > 0) {
    const results = searchData.query.search;
    console.log("Search results:", results.map(r => r.title));
    const filmMatch = results.find(r => r.title.toLowerCase().includes('(film)') || r.title.toLowerCase() === movieTitle.toLowerCase());
    if (filmMatch) {
       targetTitle = filmMatch.title;
    } else {
       targetTitle = results[0].title;
    }
  }
  
  console.log("Target title:", targetTitle);

  const pageUrl = `https://en.wikiquote.org/w/api.php?action=query&titles=${encodeURIComponent(targetTitle)}&prop=extracts&format=json&explaintext=true`;
  const pageRes = await fetch(pageUrl);
  const pageData = await pageRes.json();
  
  if (pageData?.query?.pages) {
    const pages = pageData.query.pages;
    const pageKey = Object.keys(pages)[0];
    const extractText = pages[pageKey]?.extract;
    console.log("Extract (first 500 chars):", extractText ? extractText.substring(0, 500) : null);
  }
}

testWiki("The Matrix");
testWiki("Interstellar");
