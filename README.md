# Research SQL Trainer

An interactive SQL training platform designed to teach relational database concepts through gamified missions. This application leverages an in-browser DuckDB-Wasm database for execution and integrates with Google's Gemini Pro API for intelligent SQL tutoring assistance.

## Project Name: research-sql-trainer

## Features:

*   **Interactive SQL Editor:** Write and execute SQL queries directly in the browser.
*   **Mission-Based Learning:** Progress through structured scenarios and missions, each with specific objectives and success criteria.
*   **In-Browser Database:** Powered by DuckDB-Wasm for fast, client-side SQL execution without server-side dependencies.
*   **AI SQL Tutor (Gemini Pro):** Get hints and guidance from an AI tutor (via Google GenAI) when facing challenges or syntax errors.
*   **Result Visualization:** View query results in a tabular format, compare against expected outputs.
*   **Schema Viewer & ERD:** Explore database schema and visualize Entity-Relationship Diagrams (ERD) dynamically.
*   **Session Progress Tracking:** Save and load progress on missions.
*   **Debugging Tools:** Integrated Debug Widget and Console Terminal for advanced insights.
*   **Customization:** Dark mode, font size adjustments.

## Technologies Used:

*   **Frontend Framework:** React (with Vite for fast development)
*   **Language:** TypeScript
*   **Database:** DuckDB-Wasm (in-browser analytical database)
*   **AI Integration:** Google GenAI (for Gemini Pro API interaction)
*   **Styling:** Tailwind CSS
*   **Data Visualization:** D3.js (likely used for ERD, though not directly in diff, it's a dependency in package.json)

## Getting Started:

1.  **Prerequisites:** Node.js (v20 or higher) and npm/yarn.
2.  **Clone the repository.**
3.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:5173`.
5.  **Build for production:**
    ```bash
    npm run build
    # or
    yarn build
    ```

## Mission Structure:

The application guides users through various SQL missions, each defined with a description, expected SQL query, and a success message. Progress is tracked per scenario.

## Contributing:

Contributions are welcome! Please follow the project's [GitHub Standards](link-to-github_standards.md) when submitting changes. All code changes must go through a Pull Request.

## Status:

This project is in active development, focusing on enhancing interactive learning and AI tutoring capabilities.

## License:

[License information to be added, e.g., MIT, Apache 2.0]

---
*(Auto-generated `README.md` by Gemini CLI Agent based on code analysis.)*