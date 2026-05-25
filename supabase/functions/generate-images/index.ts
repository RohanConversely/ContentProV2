Deno.serve(async () => {
  return new Response(JSON.stringify({ message: 'generate-images function scaffold' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
