-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpetas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "parent_id" INTEGER,

    CONSTRAINT "carpetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "carpeta_id" INTEGER,
    "fecha_modificacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enlaces_a_otro_archivo" (
    "origen_id" INTEGER NOT NULL,
    "destino_id" INTEGER NOT NULL,

    CONSTRAINT "enlaces_a_otro_archivo_pkey" PRIMARY KEY ("origen_id","destino_id")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" VARCHAR(7),

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_etiqueta" (
    "nota_id" INTEGER NOT NULL,
    "etiqueta_id" INTEGER NOT NULL,

    CONSTRAINT "nota_etiqueta_pkey" PRIMARY KEY ("nota_id","etiqueta_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "carpetas_usuario_id_idx" ON "carpetas"("usuario_id");

-- CreateIndex
CREATE INDEX "notas_usuario_id_idx" ON "notas"("usuario_id");

-- CreateIndex
CREATE INDEX "notas_carpeta_id_idx" ON "notas"("carpeta_id");

-- CreateIndex
CREATE INDEX "enlaces_a_otro_archivo_destino_id_idx" ON "enlaces_a_otro_archivo"("destino_id");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_nombre_key" ON "etiquetas"("nombre");

-- CreateIndex
CREATE INDEX "nota_etiqueta_etiqueta_id_idx" ON "nota_etiqueta"("etiqueta_id");

-- AddForeignKey
ALTER TABLE "carpetas" ADD CONSTRAINT "carpetas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas" ADD CONSTRAINT "carpetas_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "carpetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_carpeta_id_fkey" FOREIGN KEY ("carpeta_id") REFERENCES "carpetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enlaces_a_otro_archivo" ADD CONSTRAINT "enlaces_a_otro_archivo_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enlaces_a_otro_archivo" ADD CONSTRAINT "enlaces_a_otro_archivo_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_etiqueta" ADD CONSTRAINT "nota_etiqueta_nota_id_fkey" FOREIGN KEY ("nota_id") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_etiqueta" ADD CONSTRAINT "nota_etiqueta_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
