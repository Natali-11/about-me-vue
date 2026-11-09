<script setup>
import { ref } from 'vue';

const comments = ref([]);
const newText = ref('');

function addComment() {
  if (newText.value.trim() === '') return;
  comments.value.push({id: Date.now(), text: newText.value})
  newText.value = '';
}

function removeComment(id){
  comments.value = comments.value.filter((comment) => comment.id !== id)
}
</script>

<template>
  <div>
    <h2>Комментарии</h2>
    <form @submit.prevent="addComment">
    <input v-model="newText">
    <button>Отправить</button>
    </form>
    <p v-if="comments.length === 0"> Пока нет комментариев </p>
    <ul>
    <li v-for="comment in comments" :key="comment.id"> {{comment.text}} 
    <button @click="removeComment(comment.id)">✕</button>
    </li> </ul>
  </div>
</template>