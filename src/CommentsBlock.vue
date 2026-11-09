<script setup>
import { ref } from 'vue';

const comments = ref([]);
const newText = ref('');
const listEl = ref(null);

function addComment() {
  if (newText.value.trim() === '') return;
  const newComment = { id: Date.now(), text: newText.value };
  comments.value.push(newComment);
  renderComment(newComment);
  newText.value = '';
}

function removeComment(id,li){
  comments.value = comments.value.filter((comment) => comment.id !== id)
  li.remove();
}

function renderComment(comment){
  const li = document.createElement('li');
  li.textContent = comment.text;
  const button = document.createElement('button');
  button.textContent = '✕';
button.addEventListener('click', () => removeComment(comment.id, li));
  li.appendChild(button);
  listEl.value.appendChild(li);
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
    <ul ref="listEl">

    </ul>
  </div>
</template>