import { useEffect, useRef } from "react";
import "../styles/UniverseBackground.css";

export default function UniverseBackground({ children }) {

  const containerRef = useRef(null);

  const canvas1 = useRef(null);
  const canvas2 = useRef(null);
  const canvas3 = useRef(null);


  useEffect(() => {

    const container = containerRef.current;

    const layers = [
      { ref: canvas1, amount: 180, speed: 0.25, size: 1.2 },
      { ref: canvas2, amount: 120, speed: 0.5, size: 1.8 },
      { ref: canvas3, amount: 60, speed: 0.9, size: 2.8 },
    ];


    const animations = [];


    layers.forEach((layer) => {

      const canvas = layer.ref.current;

      if (!canvas) return;


      const ctx = canvas.getContext("2d");


      const resize = () => {

        const rect = container.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = rect.height;

      };


      resize();


      const stars = Array.from(
        { length: layer.amount },
        () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * layer.size + 0.3,
          alpha: Math.random(),
          twinkle: Math.random() * 0.02 + 0.005,
        })
      );


      let animationId;


      const animate = () => {

        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );


        stars.forEach((star)=>{


          star.alpha += star.twinkle;


          if(
            star.alpha >= 1 ||
            star.alpha <= 0.2
          ){
            star.twinkle *= -1;
          }


          star.y += layer.speed;


          if(star.y > canvas.height){

            star.y = -5;
            star.x = Math.random() * canvas.width;

          }


          ctx.beginPath();

          ctx.arc(
            star.x,
            star.y,
            star.radius,
            0,
            Math.PI * 2
          );


          ctx.fillStyle =
            `rgba(255,255,255,${star.alpha})`;

          ctx.fill();

        });


        animationId =
          requestAnimationFrame(animate);

      };


      animate();



      const observer =
        new ResizeObserver(resize);


      observer.observe(container);



      animations.push(()=>{

        cancelAnimationFrame(animationId);

        observer.disconnect();

      });


    });


    return ()=>{
      animations.forEach(
        cleanup=>cleanup()
      );
    };


  }, []);



  return (

    <div
      ref={containerRef}
      className="universe-background"
    >

      <canvas
        ref={canvas1}
        className="stars-layer layer-1"
      />

      <canvas
        ref={canvas2}
        className="stars-layer layer-2"
      />

      <canvas
        ref={canvas3}
        className="stars-layer layer-3"
      />


      <div className="nebula nebula-1"></div>
      <div className="nebula nebula-2"></div>
      <div className="nebula nebula-3"></div>


      <div className="universe-content">
        {children}
      </div>


    </div>

  );
}