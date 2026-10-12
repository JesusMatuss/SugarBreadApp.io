import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { agruparPedidos } from "../../../utils/agruparPedidos";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get("inicio");
  const fin = searchParams.get("fin");
  const tipo = searchParams.get("tipo") || "todos";

  if (!inicio || !fin) {
    return NextResponse.json(
      { error: "Se requiere fecha de inicio y fin" },
      { status: 400 }
    );
  }

  try {
    const auth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const datos = rows.map((r) => {
      const raw = r._rawData;
      return [
        raw[0] || "",
        raw[1] || "",
        raw[2] || "",
        raw[5] || "",
        raw[6] || "",
        raw[7] || "",
        raw[8] || "",
        raw[10] || "",
      ];
    });

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    console.log("Total filas leídas:", datos.length);
    console.log("Primera fila completa:", rows[0]?._rawData);
    console.log("Columnas por fila:", rows[0]?._rawData?.length);

    const filtradas = datos.filter((fila) => {
      const fechaStr = fila[6];
      if (!fechaStr || !fechaStr.includes(", ")) return false;

      const [fechaParte, horaParte] = fechaStr.split(", ");
      const [dia, mes, anio] = fechaParte.split("/").map(Number);
      const partesHora = horaParte.split(":").map(Number);
      const horas = partesHora[0];
      const minutos = partesHora[1];
      if ([dia, mes, anio, horas, minutos].some(isNaN)) return false;
      console.log("Parseando:", fechaStr, "=>", new Date(anio, mes - 1, dia, horas, minutos));

      const fechaFila = new Date(anio, mes - 1, dia, horas, minutos);

      const enRango = fechaFila >= fechaInicio && fechaFila <= fechaFin;
      const rawTipo = (fila[7] || "").toLowerCase();
      const esDelivery = rawTipo.startsWith("sí") || rawTipo.startsWith("si");
      const esSede = rawTipo.startsWith("no");
      const coincideTipo = tipo === "todos" || (tipo === "delivery" && esDelivery) || (tipo === "sede" && esSede);

      return enRango && coincideTipo;
    });

    console.log("Filtradas:", filtradas.length);

    const agrupados = agruparPedidos(filtradas);

    return NextResponse.json(agrupados);
  } catch (error) {
    console.error("Error leyendo Google Sheets:", error);
    return NextResponse.json(
      { error: "Error al leer la hoja de cálculo" },
      { status: 500 }
    );
  }
}
