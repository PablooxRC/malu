const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');

async function setupMcpServer(){
    const mcpServer = new McpServer({
        name: 'malu-mcp-server',
        version: '1.0.0'
    });
    
    // Interceptar el método onRequest del servidor
    const originalOnRequest = mcpServer.onRequest || mcpServer.handleRequest;
    
    if (originalOnRequest) {
        mcpServer.onRequest = async (request) => {
            console.log('Received request:', request.method);
            
            // Manejar listado de herramientas
            if (request.method === 'tools/list') {
                return {
                    tools: [
                        {
                            name: 'checkStatus',
                            description: 'Verify the mcp server status and health.',
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        }
                    ]
                };
            }
            
            // Manejar ejecución de herramientas
            if (request.method === 'tools/call') {
                const { name, arguments: args } = request.params;
                
                if (name === 'checkStatus') {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    mcp_status: 'online',
                                    date: new Date().toISOString()
                                })
                            }
                        ]
                    };
                }
                
                throw new Error(`Unknown tool: ${name}`);
            }
            
            // Si hay un handler original, llamarlo para otros métodos
            if (originalOnRequest) {
                return originalOnRequest.call(mcpServer, request);
            }
            
            throw new Error(`Unknown method: ${request.method}`);
        };
    }
    
    console.log('MCP CONFIGURADO');
    console.log('Métodos disponibles en mcpServer:', Object.keys(mcpServer));
    
    return mcpServer;
}

module.exports = setupMcpServer;