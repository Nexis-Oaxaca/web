<script setup lang="ts">
import { computed } from 'vue';
import { Calendar, MapPin } from 'lucide-vue-next';
import type { EventItem } from '../lib/cms';

const props = defineProps<{
  events: EventItem[];
}>();

/**
 * Parsea un string de fecha a un objeto Date válido.
 * Soporta cadenas en formato ISO (ej. 2026-08-01T12:00:00) o YYYY-MM-DD.
 */
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  if (str.includes('T')) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  if (str.includes(' ')) {
    const d = new Date(str.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
  }
  const normalized = str.replace(/\//g, '-');
  const d = new Date(`${normalized}T00:00:00`);
  if (!isNaN(d.getTime())) return d;
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

const selectEvent = computed(() => {
  if (!props.events || props.events.length === 0) return null;

  const now = new Date();

  const futureEvents: { event: EventItem; diff: number }[] = [];
  const pastEvents: { event: EventItem; diff: number }[] = [];

  props.events.forEach((event) => {
    if (!event.date) return;
    const eventDate = parseEventDate(event.date);
    if (!eventDate) return;

    const diff = eventDate.getTime() - now.getTime();
    if (diff >= 0) {
      futureEvents.push({ event, diff });
    } else {
      pastEvents.push({ event, diff: Math.abs(diff) });
    }
  });

  // 1. Si hay eventos futuros, se selecciona el más próximo (menor tiempo restante hasta el evento)
  if (futureEvents.length > 0) {
    futureEvents.sort((a, b) => a.diff - b.diff);
    return { event: futureEvents[0].event, isFuture: true };
  }

  // 2. Si no hay eventos futuros, se muestra el evento pasado más reciente (menor tiempo transcurrido desde el evento)
  if (pastEvents.length > 0) {
    pastEvents.sort((a, b) => a.diff - b.diff);
    return { event: pastEvents[0].event, isFuture: false };
  }

  return null;
});

const featured = computed(() => selectEvent.value?.event ?? null);
const isUpcoming = computed(() => selectEvent.value?.isFuture ?? false);

const formattedDate = computed(() => {
  if (!featured.value?.date) return '';
  const dateObj = parseEventDate(featured.value.date);
  if (!dateObj) return featured.value.date;
  const formatted = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Mexico_City',
  });
  return formatted.replace(/^\w/, (c) => c.toUpperCase());
});

const locationName = computed(() => featured.value?.location || 'Oaxaca');
const titleText = computed(() => featured.value?.title || '');
const descriptionText = computed(() => featured.value?.description || '');
const detailHref = computed(() => `/eventos/${featured.value?.slug ?? ''}`);
</script>

<template>
  <section v-if="featured" class="py-32 px-6 bg-marfil relative">
    <div class="absolute top-0 left-0 w-full h-12 bg-petroleo/5 divider-grecas opacity-10"></div>
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-12">
        <div class="reveal">
          <h2 class="text-4xl font-bold text-petroleo font-display">
            {{ isUpcoming ? 'Próximo Evento' : 'Último Evento' }}
          </h2>
          <p class="text-petroleo/80 mt-2">
            {{ isUpcoming ? 'No te pierdas nuestra cita más cercana.' : 'Revive nuestro encuentro más reciente.' }}
          </p>
        </div>
      </div>

      <div class="reveal bg-white rounded-[40px] overflow-hidden shadow-2xl border border-petroleo/5 flex flex-col lg:flex-row group transition-all duration-500 hover:shadow-3xl">
        <div class="lg:w-1/2 relative overflow-hidden h-72 lg:h-auto">
          <img
            :src="featured.image"
            :alt="titleText"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            :style="{ viewTransitionName: `event-image-${featured.slug}` }"
          />
          <div class="absolute inset-0 bg-linear-to-t from-petroleo/60 to-transparent"></div>
          <div class="absolute bottom-8 left-8">
            <span class="px-4 py-1.5 rounded-full bg-ambar text-petroleo text-xs font-bold uppercase tracking-wider">
              {{ isUpcoming ? 'Spotlight Event' : 'Recapitulación' }}
            </span>
          </div>
        </div>

        <div class="lg:w-1/2 p-10 lg:p-20 flex flex-col justify-center text-left">
          <div class="space-y-6">
            <div class="flex items-center space-x-6 text-jade font-bold text-sm font-sans">
              <span class="flex items-center">
                <Calendar class="mr-2 w-4 h-4 text-jade" /> {{ formattedDate }}
              </span>
              <span class="flex items-center">
                <MapPin class="mr-2 w-4 h-4 text-jade" /> {{ locationName }}
              </span>
            </div>

            <h3
              class="text-4xl lg:text-5xl font-bold text-petroleo leading-tight group-hover:text-jade transition-colors font-display"
              :style="{ viewTransitionName: `event-title-${featured.slug}` }"
            >
              {{ titleText }}
            </h3>

            <p class="text-lg text-petroleo/85 leading-relaxed font-sans line-clamp-3 md:line-clamp-5 lg:line-clamp-10">
              {{ descriptionText }}
            </p>

            <div class="flex items-center justify-between pt-10 border-t border-petroleo/10">
              <a
                :href="detailHref"
                class="bg-jade text-white px-6 py-3 lg:px-8 lg:py-4 rounded-2xl font-bold hover:bg-petroleo transition-all shadow-lg shadow-jade/20 font-sans"
              >
                {{ isUpcoming ? 'Quiero saber más' : 'Ver resumen' }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
