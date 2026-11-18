import { cargarEntradas } from "./input.js";

async function main() {

    const entradas = await cargarEntradas(
        "https://cliente.com/blog/rpa"
    );

    console.log(entradas);
}

main();