import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Touchline API",
            version: "1.0.0",
            description: "API documentation for the Touchline coaching platform",
        },
        servers: [
            {
                url: "http://localhost:3001",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./src/app/api/**/*.ts"], // Points to where your API routes are
};

export const spec = swaggerJsdoc(options);
