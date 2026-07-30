from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Listings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plant = db.Column(db.String(100), nullable=False)
    variety = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    location = db.Column(db.String(100), nullable=False)
    exchange_type = db.Column(db.String(100), nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)

    def __repr__(self):
        return f'Listings({self.plant}, {self.variety}, {self.type}, {self.quantity}, {self.location}, {self.exchange_type})'