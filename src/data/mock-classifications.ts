import type { ClassificationConfig } from "@/types"

export const mockClassifications: ClassificationConfig[] = [
  { id: "CLA-0001", name: "Reemplazo total de rodilla", description: "Procedimiento de reemplazo articular total de rodilla", active: true },
  { id: "CLA-0002", name: "Prótesis de cadera", description: "Procedimiento de prótesis total o parcial de cadera", active: true },
  { id: "CLA-0003", name: "Osteosíntesis", description: "Fijación interna de fracturas con placa, tornillos o clavos", active: true },
  { id: "CLA-0004", name: "Artroscopía", description: "Procedimiento artroscópico diagnósticativo o terapéutico", active: true },
  { id: "CLA-0005", name: "Columna", description: "Cirugía de columna vertebral cervical, dorsal o lumbar", active: true },
  { id: "CLA-0006", name: "Tobillo", description: "Reemplazo articular o fijación de tobillo", active: true },
  { id: "CLA-0007", name: "Hombro", description: "Prótesis o reparación artroscópica de hombro", active: true },
  { id: "CLA-0008", name: "Descartable", description: "Material descartable para procedimientos quirúrgicos", active: true },
  { id: "CLA-0009", name: "Otro", description: "Otros procedimientos no clasificados", active: true },
]
