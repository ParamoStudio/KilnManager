import type { Dictionary } from "./en";

export const es: Dictionary = {
  common: {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    close: "Cerrar",
    back: "← Atrás",
    confirmDelete: "¿Eliminar esto?",
    yes: "Sí",
    no: "No",
  },

  nav: {
    drafts: "Mis borradores",
    newFiring: "+ Nueva horneada",
  },

  drafts: {
    title: "Mis borradores",
    subtitle: "Tus horneadas en progreso.",
    empty: "Aún no hay borradores.",
    emptyHint: "Carga un horno para empezar uno.",
    resume: "Continuar",
    shelvesCount: (n: number) => `${n} ${n === 1 ? "balda" : "baldas"}`,
    clientsCount: (n: number) => `${n} ${n === 1 ? "cliente" : "clientes"}`,
    unassigned: "sin asignar",
    capReached: (n: number) =>
      `${n} horneadas esperando aquí. Abre Kiln Manager en el ordenador para recogerlas y podrás empezar otra.`,
    mailboxFull:
      "El ordenador aún no ha recogido las anteriores, así que estas esperan turno. Abre Kiln Manager y pasarán.",
    statusDraft: "Borrador",
    statusSynced: "Sincronizada",
    autoDeleteHint: "se borra en un día",
    deleteSynced: "Borrar sincronizadas",
    syncNow: "Subir a la app manualmente",
    syncing: "Subiendo…",
    lastSync: (time: string) => `Se sube solo · última ${time}`,
    syncError: "No se pudo subir — se reintentará al recuperar conexión",
  },

  loader: {
    pickKiln: "Elige un horno",
    pickService: "Tipo de horneada",
    kilnSummary: (dims: string, height: string) => `${dims} · ${height}`,
    addShelf: "+ Añadir balda",
    editShelf: "Editar balda",
    shelfHeight: "Altura de balda",
    custom: "Personalizado",
    fillKiln: "Llenar horno",
    stackPosts: "Sumar postes",
    add: "Añadir",
    set: "Fijar",
    cm: "cm",
    postsShelf: (post: string, shelf: string) => `postes ${post} + balda ${shelf}`,
    totalCm: (cm: string) => `${cm} cm en total`,
    splitShelf: "Dividir balda",
    splitFull: "Entera",
    done: "Hecho",
    removeShelf: "Quitar",
    firingTitlePlaceholder: "Horneada sin título",
    saveDraft: "Guardar borrador",
    myself: "Mí mismo",
    complexitySimple: "Simple",
    complexityMedium: "Media",
    complexityComplex: "Compleja",
  },

  kiln: {
    usableDiameter: "Diámetro útil",
    usableSize: "Medidas útiles",
    usableHeight: "Altura",
    full: "Entera",
    remaining: (cm: string) => `Quedan ${cm} cm`,
  },

  assign: {
    assignTitle: "Asignar a cliente",
    editTitle: "Editar asignación",
    tapHint: "Toca una zona del horno para seleccionarla.",
    shelvesSelected: (n: number) => `${n} ${n === 1 ? "balda seleccionada" : "baldas seleccionadas"}`,
    shelvesCount: (n: number) => `${n} ${n === 1 ? "balda" : "baldas"}`,
    currentlyFree: "Actualmente libres",
    assignSelection: (n: number) => `Asignar selección (${n})`,
    complexity: "Complejidad",
    complexityPerZone: "Complejidad por zona",
    complexityHelp: "Qué significa cada nivel",
    complexityHelpSimple: "Simple — una carga normal.",
    complexityHelpMedium: "Media — más tiempo o más frágil (joyas sencillas, piezas pequeñas, escultura algo frágil).",
    complexityHelpComplex: "Compleja — más tiempo y más frágil (p. ej. joyería fina, o cargas enormes de esculturas).",
    assignTo: "Asignar a",
    searchClientsPlaceholder: "Buscar clientes…",
    assignToMyself: "Asignar a mí",
    noMatch: "Sin resultados.",
    note: "Nota opcional",
    notePlaceholder: "Nota opcional para esta horneada",
    reassign: "Asignar a otro cliente",
    moveTo: (name: string) => `Mover a ${name}`,
    onlyThis: (label: string) => `Solo esta (${label})`,
    moveAllOf: (owner: string, name: string) => `Mover todas de ${owner} a ${name}`,
    emptyZone: (label: string) => `Vaciar ${label}`,
    emptyAllOf: (owner: string) => `Vaciar todas de ${owner}`,
  },

  home: {
    howItWorks: "Cómo funciona",
    sync: "Sincronizar",
    infoTitle: "Cómo funciona",
    infoBody:
      "Carga tus hornos aquí en el estudio: elige un horno, monta las baldas y asigna cada zona a un cliente. Los borradores se guardan solos. Después sincronizas con tu ordenador para terminar el precio y la factura allí.",
    syncTitle: "Sincronizar con tu ordenador",
    syncBody:
      "Este móvil aún no está emparejado. En el ordenador, abre Kiln Manager → Ajustes → «Cargar horno con el móvil» y escanea el QR una vez. Después, «Sincronizar ahora» envía tus borradores al ordenador y recibe tus hornos y clientes actualizados — sin cuentas.",
    notPaired: "Sin emparejar",
  },


  fixture: {
    seedButton: "Cargar hornos y clientes de ejemplo (dev)",
    seeded: "Datos de ejemplo cargados.",
  },
};
