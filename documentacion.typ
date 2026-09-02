#import "@preview/diagraph:0.3.2": raw-render

#set page(paper: "a5")
#set heading(numbering: "1.")

#show link: set text(fill: blue, weight: 700)
#show link: underline

#align(center)[
  #text(size: 16pt, weight: "bold")[Proyecto: Web de Obsidian] \
  #v(1em)
]

= Contexto
El presente proyecto tiene como propósito desarrollar una aplicación web inspirada en Obsidian, permitiendo a los usuarios crear, organizar y enlazar notas en formato Markdown. Se busca replicar la experiencia del grafo de conocimiento y los enlaces bidireccionales en un entorno accesible desde cualquier navegador.

= Roles e integrantes
- *Adam Ordoñes:* [Definir rol]
- *Martin Sanmiguel:* [Definir rol]
- *Nicolas Torres:* [Definir rol]
- *Ana Murcia:* [Definir rol]
- *Nicolas Bustos:* [Definir rol]
- *Andres Felipe Cortez:* [Definir rol]
- *Nicolas Castañedo:* [Definir rol]
- *Ivan Santiago Lastra:* [Definir rol]
- *Salomon Avila:* [Definir rol]

= Objetivos (alcance del proyecto)
- Desarrollar un editor de notas basado en Markdown.
- Implementar un sistema de carpetas anidadas para la jerarquía de archivos.
- Construir un motor de enlaces bidireccionales (ej. `[[Nombre de la nota]]`).
- Garantizar que los datos de cada usuario estén aislados y seguros de forma relacional.

= Diagrama arquitectura
// Espacio para la arquitectura web

== Diagrama entidad relacion
A continuación se detalla el modelo de datos inicial. Se ha estructurado para soportar notas, carpetas recursivas y un sistema de relaciones de muchos a muchos para los enlaces.

#align(center)[
  #image("diagrama.svg", width: 95%)
]

= Requisitos
*Requisitos Funcionales:*
- El sistema debe permitir el registro y autenticación de usuarios.
- Las carpetas deben soportar recursividad (carpetas dentro de carpetas).
- Al actualizar el título de una nota, los enlaces bidireccionales que apunten a ella deben mantener la integridad.

*Requisitos No Funcionales:*
- La documentación y el código fuente deben estar versionados en GitHub.
- La base de datos debe ser relacional para manejar correctamente la integridad de las llaves foráneas.



