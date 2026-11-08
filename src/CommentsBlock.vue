<script setup>
import { ref } from 'vue';

const comments = ref([]);
const newText = ref('');

function addComment() {
  // 1. если newText.value пустой (или из одних пробелов) — выйти: return
  if (newText.value.trim() === '') return;
  //    подсказка: newText.value.trim() убирает пробелы по краям
  comments.value.push({id: Date.now(), text: newText.value})
  // 2. push в comments объект { id: ..., text: ... }
  // 3. очистить поле
  newText.value = '';
}
</script>

<template>
  <div>
    <h2>Комментарии</h2>
    <!-- form с @submit.prevent, внутри input с v-model и button -->
    <form @submit.prevent="addComment">
    <input v-model="newText">
    <button>Отправить</button>
    </form>
    <p v-if="comments.length === 0"> Пока нет комментариев </p>
    <!-- p с v-if, если комментариев нет -->
    <ul>
    <li v-for="comment in comments" :key=comments.value> {{comment.text}} </li> </ul>
    <!-- список: v-for по comments, выводим текст -->
  </div>
</template>