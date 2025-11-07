import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BUCKET_NAME = 'make-ef33fc5d-well-files';

// Initialize storage bucket
async function initStorage() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
  
  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760 // 10MB
    });
    console.log(`Created bucket: ${BUCKET_NAME}`);
  }
}

initStorage().catch(console.error);

// Get all wells
app.get('/make-server-ef33fc5d/wells', async (c) => {
  try {
    const wells = await kv.getByPrefix('well:');
    console.log('Fetched wells:', wells);
    return c.json({ success: true, wells });
  } catch (error) {
    console.error('Error fetching wells:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create a new well
app.post('/make-server-ef33fc5d/wells', async (c) => {
  try {
    const { name, depth } = await c.req.json();
    
    if (!name || !depth) {
      return c.json({ success: false, error: 'Name and depth are required' }, 400);
    }

    const wellId = `well:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const well = {
      id: wellId,
      name,
      depth,
      createdAt: new Date().toISOString()
    };

    await kv.set(wellId, well);
    console.log('Created well:', well);
    
    return c.json({ success: true, well });
  } catch (error) {
    console.error('Error creating well:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Upload well data file
app.post('/make-server-ef33fc5d/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const wellId = formData.get('wellId') as string;

    if (!file || !wellId) {
      return c.json({ success: false, error: 'File and wellId are required' }, 400);
    }

    console.log('Uploading file for well:', wellId, 'File name:', file.name);

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const fileName = `${wellId}/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return c.json({ success: false, error: `Storage upload error: ${uploadError.message}` }, 500);
    }

    console.log('File uploaded to storage:', uploadData);

    // Parse Excel file using xlsx library
    const XLSX = await import('npm:xlsx@0.18.5');
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Parsed Excel data, rows:', jsonData.length);

    // Process and store the data
    const wellData = jsonData.map((row: any) => ({
      depth: row['DEPTH'] || row['Depth'] || row['depth'] || 0,
      rockComposition: row['ROCK_COMPOSITION'] || row['Rock Composition'] || row['Rock_Composition'] || row['rock_composition'] || '',
      DT: row['DT'] || row['dt'] || 0,
      GR: row['GR'] || row['gr'] || 0
    }));

    // Store parsed data in KV
    const dataKey = `welldata:${wellId}`;
    await kv.set(dataKey, {
      wellId,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      storagePath: fileName,
      data: wellData
    });

    console.log('Stored well data with key:', dataKey);

    return c.json({ 
      success: true, 
      message: 'File uploaded and processed successfully',
      rowCount: wellData.length,
      wellData
    });
  } catch (error) {
    console.error('Error uploading and processing file:', error);
    return c.json({ success: false, error: `Upload processing error: ${String(error)}` }, 500);
  }
});

// Get well data
app.get('/make-server-ef33fc5d/well-data/:wellId', async (c) => {
  try {
    const wellId = c.req.param('wellId');
    const dataKey = `welldata:${wellId}`;
    
    const wellData = await kv.get(dataKey);
    
    if (!wellData) {
      return c.json({ success: false, error: 'No data found for this well' }, 404);
    }

    console.log('Fetched well data for:', wellId);
    return c.json({ success: true, wellData });
  } catch (error) {
    console.error('Error fetching well data:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete well data
app.delete('/make-server-ef33fc5d/well-data/:wellId', async (c) => {
  try {
    const wellId = c.req.param('wellId');
    const dataKey = `welldata:${wellId}`;
    
    // Get the data first to find the storage path
    const wellData = await kv.get(dataKey) as any;
    
    if (wellData && wellData.storagePath) {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([wellData.storagePath]);
      
      if (deleteError) {
        console.error('Error deleting file from storage:', deleteError);
      }
    }
    
    // Delete from KV
    await kv.del(dataKey);
    
    console.log('Deleted well data for:', wellId);
    return c.json({ success: true, message: 'Well data deleted successfully' });
  } catch (error) {
    console.error('Error deleting well data:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Chatbot endpoint
app.post('/make-server-ef33fc5d/chat', async (c) => {
  try {
    const { message, wellId } = await c.req.json();
    
    if (!message) {
      return c.json({ success: false, error: 'Message is required' }, 400);
    }

    console.log('Chat request for well:', wellId, 'Message:', message);

    // Get well data if wellId is provided
    let wellContext = '';
    if (wellId) {
      const well = await kv.get(wellId) as any;
      const dataKey = `welldata:${wellId}`;
      const wellData = await kv.get(dataKey) as any;
      
      if (well && wellData) {
        // Summarize the data for context
        const dataStats = {
          wellName: well.name,
          wellDepth: well.depth,
          dataPoints: wellData.data.length,
          depthRange: {
            min: Math.min(...wellData.data.map((d: any) => d.depth)),
            max: Math.max(...wellData.data.map((d: any) => d.depth))
          },
          rockTypes: [...new Set(wellData.data.map((d: any) => d.rockComposition))],
          dtRange: {
            min: Math.min(...wellData.data.map((d: any) => d.DT)),
            max: Math.max(...wellData.data.map((d: any) => d.DT)),
            avg: wellData.data.reduce((sum: number, d: any) => sum + d.DT, 0) / wellData.data.length
          },
          grRange: {
            min: Math.min(...wellData.data.map((d: any) => d.GR)),
            max: Math.max(...wellData.data.map((d: any) => d.GR)),
            avg: wellData.data.reduce((sum: number, d: any) => sum + d.GR, 0) / wellData.data.length
          },
          sampleData: wellData.data.slice(0, 10) // First 10 data points
        };

        wellContext = `\n\nYou are analyzing data for "${well.name}" (Total Depth: ${well.depth} ft).

Current well drilling data summary:
- Total data points: ${dataStats.dataPoints}
- Depth range: ${dataStats.depthRange.min.toFixed(2)} - ${dataStats.depthRange.max.toFixed(2)} ft
- Rock compositions found: ${dataStats.rockTypes.join(', ')}
- DT (Delta-T/Sonic) measurements: Range ${dataStats.dtRange.min.toFixed(2)} - ${dataStats.dtRange.max.toFixed(2)}, Average ${dataStats.dtRange.avg.toFixed(2)}
- GR (Gamma Ray) measurements: Range ${dataStats.grRange.min.toFixed(2)} - ${dataStats.grRange.max.toFixed(2)}, Average ${dataStats.grRange.avg.toFixed(2)}

Sample data points (first 10):
${JSON.stringify(dataStats.sampleData, null, 2)}

Full dataset is available if needed for detailed analysis.`;
      }
    }

    const systemPrompt = `You are an AI assistant specialized in oil and gas well drilling data analysis. You help drilling engineers and geologists understand their well data, including:
- Rock composition and lithology
- DT (Delta-T or Sonic log) measurements - which indicate rock porosity and formation characteristics
- GR (Gamma Ray) measurements - which help identify rock types and clay content

Provide clear, technical explanations while being accessible. When analyzing data:
- Explain what the measurements mean
- Identify patterns or anomalies
- Suggest interpretations based on standard industry knowledge
- Be specific when referring to the data provided${wellContext}`;

    // Try Google Gemini first (free tier available)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (geminiApiKey) {
      console.log('Using Google Gemini API');
      
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nUser: ${message}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            }
          })
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const assistantMessage = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
        console.log('Gemini response generated successfully');
        return c.json({ success: true, message: assistantMessage });
      } else {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', errorText);
      }
    }

    // Fall back to OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      console.log('Using OpenAI API');
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        console.error('OpenAI API error response:', JSON.stringify(errorData, null, 2));
        
        let errorMessage = 'OpenAI API error: ';
        if (errorData.error?.code === 'insufficient_quota') {
          errorMessage += 'You have exceeded your OpenAI quota. Please:\n1. Add credits at https://platform.openai.com/account/billing\n2. OR use Google Gemini instead (add GEMINI_API_KEY)\n3. Get free Gemini API key at https://aistudio.google.com/app/apikey';
        } else if (errorData.error?.code === 'invalid_api_key') {
          errorMessage += 'Invalid OpenAI API key. Please update your API key.';
        } else if (errorData.error?.message) {
          errorMessage += errorData.error.message;
        }
        
        return c.json({ success: false, error: errorMessage }, 500);
      }

      const openaiData = await openaiResponse.json();
      const assistantMessage = openaiData.choices[0]?.message?.content || 'No response generated';
      console.log('OpenAI response generated successfully');
      return c.json({ success: true, message: assistantMessage });
    }

    // No API keys configured
    return c.json({ 
      success: false, 
      error: 'No AI API key configured. Please add either:\n1. GEMINI_API_KEY (free tier available at https://aistudio.google.com/app/apikey)\n2. OPENAI_API_KEY (requires billing at https://platform.openai.com/account/billing)' 
    }, 500);
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return c.json({ success: false, error: `Chat error: ${String(error)}` }, 500);
  }
});

Deno.serve(app.fetch);