/**
 * argentina-geography.ts
 * Provincias y localidades de Argentina.
 * Fuente única de verdad para selects de ubicación.
 */

export const PROVINCIAS_ARGENTINA: string[] = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
]

export const LOCALIDADES_POR_PROVINCIA: Record<string, string[]> = {
  "Buenos Aires": [
    "La Plata", "Mar del Plata", "Bahía Blanca", "Tandil",
    "San Nicolás", "Zárate", "Pergamino", "Junín",
    "Olavarría", "Azul", "Luján", "Chivilcoy", "Otra",
  ],
  "CABA": [
    "Palermo", "Recoleta", "Caballito", "Flores",
    "Belgrano", "Almagro", "Boedo", "Balvanera",
    "Villa Urquiza", "Núñez", "Barracas", "La Boca", "Otra",
  ],
  "Catamarca": [
    "San Fernando del Valle de Catamarca", "Valle Viejo", "Fray Mamerto Esquiú",
    "Andalgalá", "Belén", "Santa María", "Tinogasta",
    "Recreo", "San Isidro", "Otra",
  ],
  "Chaco": [
    "Resistencia", "Corrientes (área metrop.)", "Presidencia Roque Sáenz Peña",
    "Villa Ángela", "Charata", "General San Martín",
    "Las Breñas", "Machagai", "Fontana", "Otra",
  ],
  "Chubut": [
    "Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Rawson",
    "Esquel", "Gaiman", "Dolavon", "Sarmiento",
    "El Maitén", "Rada Tilly", "Otra",
  ],
  "Córdoba": [
    "Córdoba", "Río Cuarto", "Villa María", "San Francisco",
    "Villa Carlos Paz", "Alta Gracia", "Jesús María",
    "Bell Ville", "Río Segundo", "Laboulaye", "Otra",
  ],
  "Corrientes": [
    "Corrientes", "Goya", "Posadas (área metrop.)", "Paso de los Libres",
    "Mercedes", "Curuzú Cuatiá", "Empedrado",
    "Bella Vista", "Santo Tomé", "Esquina", "Otra",
  ],
  "Entre Ríos": [
    "Paraná", "Concordia", "Gualeguaychú", "Victoria",
    "Gualeguay", "Concepción del Uruguay", "Federal",
    "Villaguay", "Diamante", "Nogoyá", "Otra",
  ],
  "Formosa": [
    "Formosa", "Clorinda", "Pirané", "El Colorado",
    "Las Lomitas", "Ing. Juárez", "Pozo del Tigre",
    "Villa Dos Trece", "Comandante Fontana", "Otra",
  ],
  "Jujuy": [
    "San Salvador de Jujuy", "Palpalá", "Libertador General San Martín",
    "Perico", "San Pedro", "La Quiaca", "Humahuaca",
    "Tilcara", "Caimancito", "El Carmen", "Otra",
  ],
  "La Pampa": [
    "Santa Rosa", "General Pico", "Toay", "Realicó",
    "Eduardo Castex", "Victorica", "General Acha",
    "Macachín", "Colonia Barón", "Bernasconi", "Otra",
  ],
  "La Rioja": [
    "La Rioja", "Chilecito", "Arauco", "Famatina",
    "Chamical", "Chepes", "Nonogasta",
    "Villa Unión", "San Blas de los Sauces", "Otra",
  ],
  "Mendoza": [
    "Mendoza", "Godoy Cruz", "Las Heras", "Luján de Cuyo",
    "San Rafael", "Maipú", "Guaymallén",
    "Tunuyán", "San Martín", "Rivadavia", "Otra",
  ],
  "Misiones": [
    "Posadas", "Oberá", "Puerto Iguazú", "Eldorado",
    "San Vicente", "Leandro N. Alem", "Apóstoles",
    "Jardín América", "Oberá", "Andresito", "Otra",
  ],
  "Neuquén": [
    "Neuquén", "Plottier", "Cipolletti (área metrop.)", "Centenario",
    "San Martín de los Andes", "Villa La Angostura", "Zapala",
    "Junín de los Andes", "Chos Malal", "Rincón de los Sauces", "Otra",
  ],
  "Río Negro": [
    "Bariloche", "General Roca", "Cipolletti", "Viedma",
    "Allen", "Villa Regina", "Cinco Saltos",
    "San Carlos de Bariloche", "El Bolsón", "Ingeniero Huergo", "Otra",
  ],
  "Salta": [
    "Salta", "San Ramón de la Nueva Orán", "Tartagal", "Metán",
    "Cafayate", "Jujuy (área metrop.)", "Cerrillos",
    "General Güemes", "Rosario de la Frontera", "La Caldera", "Otra",
  ],
  "San Juan": [
    "San Juan", "Rawson", "Chimbas", "Rivadavia",
    "Santa Lucía", "Pocito", "Caucete",
    "Jáchal", "San Martín", "Albardón", "Otra",
  ],
  "San Luis": [
    "San Luis", "Villa Mercedes", "La Punta", "Merlo",
    "Concarán", "Santa Rosa del Conlara", "Juana Koslay",
    "Potrero de los Funes", "Tilisarao", "Nogolí", "Otra",
  ],
  "Santa Cruz": [
    "Río Gallegos", "Caleta Olivia", "Pico Truncado", "El Calafate",
    "Puerto Deseado", "Perito Moreno", "Las Heras",
    "Los Antiguos", "Comandante Luis Piedra Buena", "Otra",
  ],
  "Santa Fe": [
    "Santa Fe", "Rosario", "Rafaela", "Venado Tuerto",
    "Reconquista", "Santo Tomé", "Gálvez",
    "Villa Gobernador Gálvez", "San Lorenzo", "Las Rosas", "Otra",
  ],
  "Santiago del Estero": [
    "Santiago del Estero", "La Banda", "Termas de Río Hondo",
    "Frías", "Añatuya", "Quimilí", "Loreto",
    "Bandera", "Fernández", "Otra",
  ],
  "Tierra del Fuego": [
    "Ushuaia", "Río Grande", "Tolhuin", "Otra",
  ],
  "Tucumán": [
    "San Miguel de Tucumán", "Yerba Buena", "Tafí Viejo",
    "Concepción", "Banda del Río Salí", "Aguilares",
    "Famaillá", "Monteros", "Simoca", "La Cocha", "Otra",
  ],
}
