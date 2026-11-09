<script setup>
import { ref } from 'vue';
import img1 from './assets/img1.jpg';
import pattern from './assets/pattern.jpg';
import catAwake from './assets/awake.gif';
import catLieDown from './assets/lie-down.gif';
import catGetUp from './assets/get-up.gif';
import catSleep from './assets/sleep.gif';
import CommentsBlock from './CommentsBlock.vue';


const hobbies = [
  'Рисование — рисую с детства, в свободное время делаю арты в Paint Tool Sai 2 или в скетчбуке',
  'Хип-хоп — почти год занималась танцами и мечтаю к ним вернуться',
  'Тренажёрный зал — помогает отвлечься от учёбы',
  'Английский язык — смотрю мультфильмы в оригинале, чтобы пополнить vocabulary',
  'Blender — в школе делала проект по 3D-моделированию и хочу развиваться в этом направлении',
];

const contacts = [
  { name: 'Telegram', url: 'https://t.me/molinat1' },
  { name: 'Почта', url: 'mailto:pomolcevanatasa73@gmail.com' },
  { name: 'ВКонтакте', url: 'https://vk.ru/wai_kl' },
];

const skills = ['C++', 'HTML и CSS', 'JavaScript', 'Python', 'React', 'Vue.js', 'Ассемблер', 'Blender', 'Figma', 'Paint Tool Sai'];

const isNight = ref(false);
const cat = ref(catAwake);

function toggle() {
  const transition = isNight.value ? catGetUp : catLieDown;
  cat.value = transition + '?t=' + Date.now();
  isNight.value = !isNight.value;
}

function onCatLoad() {
  if (cat.value.startsWith(catLieDown)) {
    setTimeout(() => { cat.value = catSleep; }, 1350);
  }
  if (cat.value.startsWith(catGetUp)) {
    setTimeout(() => { cat.value = catAwake; }, 1350);
  }
}
</script>

<template>
  <div class="page">
    <div class="card">
      <div class="grid">

        <div class="cell">
          <div class="photo-frame">
            <div class="square"></div>
            <img class="photo" :src="img1" alt="Моё фото" title="Это лето было особенным">
          </div>
        </div>

        <div class="cell">
          <h1 class="title">Привет, я Наталья Помольцева!</h1>
          <h2 class="subtitle">Краткая биография</h2>
          <div class="block">
            <p class="text">
              Я родилась и выросла в Усть-Каменогорске, на востоке Казахстана.
              Ещё в школе я полюбила математику и информатику: учительница
              отправляла меня на олимпиады и занималась со мной дополнительно в свободное от учёбы время.
              Именно она посоветовала мне НГТУ в Новосибирске.
            </p>
            <p class="text">
              Чтобы поступить, я переехала в Россию, окончила Лицей №7 в Рубцовске
              и сдала ЕГЭ по математике, информатике и русскому языку. Сейчас
              я учусь на факультете прикладной математики и информатики НГТУ.
            </p>
            <p class="text">
              За это время я сменила город и окружение и поняла, что хочу
              развиваться не только в программировании. Меня привлекает
              3D-моделирование, а недавно появилась возможность попробовать
              себя в спорте.
            </p>
          </div>
        </div>

        <div class="cell">
          <h2 class="subtitle">Где меня найти?</h2>
          <a
            v-for="contact in contacts"
            :key="contact.name"
            class="link"
            :href="contact.url"
            target="_blank"
            rel="noreferrer"
          >{{ contact.name }}</a>

          <h2 class="subtitle">Навыки</h2>
          <p class="text">Знаю азы или пробовала работать:</p>
          <div class="tags">
            <span v-for="skill in skills" :key="skill" class="tag">{{ skill }}</span>
          </div>
        </div>

        <div class="cell">
          <h2 class="subtitle">Мои хобби</h2>
          <ul class="list">
            <li v-for="hobby in hobbies" :key="hobby" class="item">{{ hobby }}</li>
          </ul>
          <img class="pattern" :src="pattern" alt="Кошка на полянке">
        </div>

        <div class="wide-cell">
          <div>
            <img :key="cat" class="cat-image" :src="cat" alt="Кот" @load="onCatLoad">
            <button class="button" @click="toggle">{{ isNight ? '☀︎' : '⏾' }}</button>
          </div>
          <div>
            <h2 class="subtitle">Моя учёба</h2>
            <p class="text">
              Сейчас я учусь на 3 курсе факультета прикладной математики и информатики.
              Моя учёба сочетает математику и программирование в разных направлениях:
              численные методы, математическая статистика, криптография и теория информации.
            </p>
            <p class="text">
              Лабораторные работы мы пишем в основном на C++ и Python. Постепенно разбираюсь в
              объектно-ориентированном программировании и низкоуровневой работе
              компьютера. В прошлом семестре я участвовала в команде по созданию виртуальной
              лабораторной работы по физике в Unity, и именно там соединились мои интересы:
              программирование, математика и моделирование в Blender. А эта страница — мой
              первый проект на Vue.js.
            </p>
          </div>
        </div>
        <div class="wide-cell">
        <CommentsBlock />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #ffffff;
  background-image:
    linear-gradient(90deg, rgba(110, 150, 90, 0.5) 50%, transparent 50%),
    linear-gradient(rgba(110, 150, 90, 0.5) 50%, transparent 50%);
  background-size: 80px 80px;
  padding: 40px;
  font-family: Georgia, serif;
  color: #153e09;
}

.title {
  text-decoration: underline;
  text-decoration-color: #a32d54;
  text-decoration-thickness: 4px;
  text-underline-offset: 10px;
  font-size: 64px;
  font-style: italic;
  margin: 0;
}

.subtitle {
  color: #a32d54;
  font-size: 28px;
  font-style: italic;
  animation: glow 3s infinite;
}

@keyframes glow {
  0%   { text-shadow: 0 0 4px #ffffff, 0 0 8px #ff5f6a; }
  50%  { text-shadow: 0 0 8px #ffffff, 0 0 20px #ff5f6a, 0 0 30px #ff5f6a; }
  100% { text-shadow: 0 0 4px #ffffff, 0 0 8px #ff5f6a; }
}

.text {
  transition: transform 0.2s;
  font-size: 18px;
  line-height: 1.6;
}

.text:hover {
  transform: translateY(-4px);
}

.block {
  max-width: 800px;
  padding: 10px 30px;
  background-color: rgba(255, 255, 255, 0.74);
  border-radius: 20px;
}

.list {
  font-size: 20px;
  color: #c9e8cb;
  background-color: #8a4c65;
  padding: 20px 40px;
  border-radius: 20px;
  line-height: 1.6;
}

.item {
  transition: transform 0.2s;
}

.item:hover {
  transform: translateY(-4px);
}

.link {
  color: #4f6a28;
  font-size: 20px;
  margin-right: 20px;
}

.link:hover {
  color: #6ba555;
}

.card {
  max-width: 1500px;
  margin: 0 auto;
  background-color: #fff8f3;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
}

.cell {
  padding: 30px;
  border: 1px solid #e04848;
}

.photo-frame {
  position: relative;
  display: inline-block;
  margin: 20px;
}

.square {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #b53036;
  transform: rotate(6deg);
}

.photo {
  position: relative;
  display: block;
  width: 350px;
  transform: rotate(-4deg);
  transition: transform 0.4s;
}

.photo:hover {
  transform: rotate(0deg);
}

.pattern {
  display: block;
  width: 250px;
  margin: 20px auto 0;
  border-radius: 15px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 12px;
  border: 1.5px solid #a32d54;
  border-radius: 20px;
  color: #a32d54;
  font-size: 16px;
}

.wide-cell {
  grid-column: 1 / -1;
  display: flex;
  gap: 40px;
  padding: 30px;
  border: 1px solid #e04848;
}

.cat-image {
  display: block;
  width: 400px;
  aspect-ratio: 4 / 3;
  border-radius: 30px;
  background-color: #ffc59c;
}

.button {
  color: #f8fa81;
  display: block;
  margin: 15px auto 0;
  font-size: 32px;
  padding: 5px 20px;
  border: none;
  border-radius: 20px;
  background-color: #a73562;
  cursor: pointer;
}
</style>